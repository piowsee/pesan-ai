import eventBus, { SSE_EVENTS, getUserEvent } from '@/lib/chat/event-bus';
import { decrypt } from '@/lib/server/encryption';
import { logError } from '@/lib/server/logger';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { MessageRepository } from '@/repositories/message.repository';
import { WebhookRepository } from '@/repositories/webhook.repository';
import { MetaFetchService } from '@/services/meta-fetch.service';
import { redirectMessageToExternalWebhook } from '@/services/redirect-message.service';
import { WebhookService } from '@/services/webhook.service';
import { betterFetch } from '@better-fetch/fetch';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import z from 'zod';

vi.unmock('@/services/redirect-message.service');
vi.mock('@better-fetch/fetch', () => ({
  betterFetch: vi.fn(),
}));

function messageHistory(content: string) {
  return [
    {
      sequence: 1,
      source: 'customer',
      direction: 'incoming',
      timestamp: new Date('2026-06-24T10:00:00.000Z'),
      content,
    },
  ];
}

describe('redirectMessageToExternalWebhook', { tags: ['backend'] }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(WebhookService._generateWebhookToken).mockResolvedValue(
      'signed-webhook-jwt',
    );
    vi.mocked(ConversationRepository.findConversationById).mockResolvedValue({
      id: 'conv-1',
      contact: {
        id: 'contact-1',
        bsuid: 'US.redirect-customer-123',
        customerPhone: '+123456',
        customerName: 'Test Customer',
        customerUsername: null,
        createdAt: new Date('2026-06-23T09:00:00.000Z'),
        updatedAt: new Date('2026-06-24T09:00:00.000Z'),
      },
      adminTakeover: false,
      lastMessageAt: new Date('2026-06-24T10:00:00.000Z'),
      lastCustomerMessageAt: new Date('2026-06-24T09:00:00.000Z'),
      unreadCount: 2,
      status: 'active',
      createdAt: new Date('2026-06-23T10:00:00.000Z'),
      updatedAt: new Date('2026-06-24T10:00:00.000Z'),
      phoneNumber: {
        id: 'phone-1',
        phoneNumberId: 'meta-phone-1',
        displayPhoneNumber: '+654321',
        wabaId: 'waba-1',
        businessProfile: null,
        waba: {
          id: 'waba-1',
          systemUserToken: 'encrypted-token',
          userId: 'user-1',
        },
      },
    });
    vi.mocked(
      ConversationRepository.updateAdminTakeoverStatus,
    ).mockResolvedValue({
      id: 'conv-1',
      adminTakeover: true,
    });
  });

  afterEach(() => {
    eventBus.removeAllListeners();
  });

  it('posts ordered message history with source and timestamp metadata', async () => {
    vi.mocked(WebhookRepository.findWebhookByConversationId).mockResolvedValue({
      url: 'https://bot.example.com/message',
      passphrase: 'encrypted-passphrase',
      isActive: true,
    });
    vi.mocked(decrypt).mockImplementation((value) =>
      value === 'encrypted-passphrase' ? 'plain-passphrase' : 'plain-token',
    );
    vi.mocked(betterFetch).mockResolvedValue({
      data: { botResponse: 'ok', adminTakeover: false },
      error: null,
    } as never);
    vi.mocked(MetaFetchService.sendMessage).mockResolvedValue({
      status: 'sent',
      messageId: 'wa-msg-1',
    });
    vi.mocked(MessageRepository.saveMessage).mockResolvedValue({
      id: 'msg-1',
    } as never);

    const result = await redirectMessageToExternalWebhook({
      conversationId: 'conv-1',
      userId: 'user-1',
      wabaId: 'waba-1',
      messages: [
        {
          sequence: 1,
          source: 'whatsapp_app',
          direction: 'outgoing',
          timestamp: new Date('2026-06-24T09:59:00.000Z'),
          content: 'hello',
        },
        {
          sequence: 2,
          source: 'whatsapp_app',
          direction: 'incoming',
          timestamp: new Date('2026-06-24T10:00:00.000Z'),
          content: 'need help',
        },
      ],
    });

    expect(result).toEqual({ botResponse: 'ok', adminTakeover: false });
    expect(ConversationRepository.findConversationById).toHaveBeenCalledTimes(
      1,
    );
    expect(WebhookRepository.findWebhookByConversationId).toHaveBeenCalledWith({
      conversationId: 'conv-1',
    });
    expect(decrypt).toHaveBeenCalledWith('encrypted-passphrase');
    expect(WebhookService._generateWebhookToken).toHaveBeenCalledWith({
      url: 'https://bot.example.com/message',
      passphrase: 'plain-passphrase',
    });
    expect(betterFetch).toHaveBeenCalledWith(
      'https://bot.example.com/message',
      expect.objectContaining({
        method: 'POST',
        auth: { type: 'Bearer', token: 'signed-webhook-jwt' },
        body: {
          customerIdentifier: 'US.redirect-customer-123',
          messages: [
            {
              sequence: 1,
              source: 'admin',
              timestamp: new Date('2026-06-24T09:59:00.000Z'),
              content: 'hello',
            },
            {
              sequence: 2,
              source: 'customer',
              timestamp: new Date('2026-06-24T10:00:00.000Z'),
              content: 'need help',
            },
          ],
        },
      }),
    );
    expect(
      ConversationRepository.updateAdminTakeoverStatus,
    ).not.toHaveBeenCalled();
    expect(MetaFetchService.sendMessage).toHaveBeenCalledWith({
      phoneNumberId: 'meta-phone-1',
      token: 'plain-token',
      to: 'US.redirect-customer-123',
      message: { type: 'text', text: 'ok' },
    });
    expect(MessageRepository.saveMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conv-1',
        direction: 'outgoing',
        source: 'bot',
        type: 'text',
        content: 'ok',
        status: 'sent',
        messageId: 'wa-msg-1',
      }),
    );
  });

  it.each([
    { label: 'missing', data: { adminTakeover: false } },
    { label: 'empty', data: { botResponse: '', adminTakeover: false } },
    { label: 'null', data: { botResponse: null, adminTakeover: false } },
  ])(
    'does not send a WhatsApp message when bot response is $label',
    async ({ data }) => {
      vi.mocked(
        WebhookRepository.findWebhookByConversationId,
      ).mockResolvedValue({
        url: 'https://bot.example.com/message',
        passphrase: 'encrypted-passphrase',
        isActive: true,
      });
      vi.mocked(betterFetch).mockResolvedValue({
        data,
        error: null,
      } as never);

      const result = await redirectMessageToExternalWebhook({
        conversationId: 'conv-1',
        userId: 'user-1',
        wabaId: 'waba-1',
        messages: messageHistory('hello'),
      });

      expect(result).toEqual(data);
      expect(MetaFetchService.sendMessage).not.toHaveBeenCalled();
      expect(MessageRepository.saveMessage).not.toHaveBeenCalled();
      expect(
        ConversationRepository.updateAdminTakeoverStatus,
      ).not.toHaveBeenCalled();
    },
  );

  it('persists admin takeover without sending when bot response is empty', async () => {
    vi.mocked(WebhookRepository.findWebhookByConversationId).mockResolvedValue({
      url: 'https://bot.example.com/message',
      passphrase: 'encrypted-passphrase',
      isActive: true,
    });
    vi.mocked(betterFetch).mockResolvedValue({
      data: { botResponse: '', adminTakeover: true },
      error: null,
    } as never);

    await redirectMessageToExternalWebhook({
      conversationId: 'conv-1',
      userId: 'user-1',
      wabaId: 'waba-1',
      messages: messageHistory('I need a human'),
    });

    expect(
      ConversationRepository.updateAdminTakeoverStatus,
    ).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      adminTakeover: true,
    });
    expect(eventBus.emit).toHaveBeenCalledWith(
      getUserEvent(SSE_EVENTS.CONVERSATION_UPDATED, 'user-1'),
      {
        conversationId: 'conv-1',
        wabaId: 'waba-1',
        adminTakeover: true,
      },
    );
    expect(MetaFetchService.sendMessage).not.toHaveBeenCalled();
    expect(MessageRepository.saveMessage).not.toHaveBeenCalled();
  });

  it('does not call queued bot work after admin takeover is enabled', async () => {
    vi.mocked(ConversationRepository.findConversationById).mockResolvedValue({
      id: 'conv-1',
      adminTakeover: true,
      phoneNumber: { waba: { userId: 'user-1' } },
    } as never);

    const result = await redirectMessageToExternalWebhook({
      conversationId: 'conv-1',
      userId: 'user-1',
      wabaId: 'waba-1',
      messages: messageHistory('queued message'),
    });

    expect(result).toBeUndefined();
    expect(
      WebhookRepository.findWebhookByConversationId,
    ).not.toHaveBeenCalled();
    expect(betterFetch).not.toHaveBeenCalled();
    expect(MetaFetchService.sendMessage).not.toHaveBeenCalled();
    expect(MessageRepository.saveMessage).not.toHaveBeenCalled();
  });

  it('persists the external agent takeover decision before sending its response', async () => {
    vi.mocked(WebhookRepository.findWebhookByConversationId).mockResolvedValue({
      url: 'https://bot.example.com/message',
      passphrase: 'encrypted-passphrase',
      isActive: true,
    });
    vi.mocked(betterFetch).mockResolvedValue({
      data: {
        botResponse: 'I am connecting you with an admin.',
        adminTakeover: true,
      },
      error: null,
    } as never);
    vi.mocked(
      ConversationRepository.updateAdminTakeoverStatus,
    ).mockResolvedValue({
      id: 'conv-1',
      adminTakeover: true,
    });
    vi.mocked(MetaFetchService.sendMessage).mockResolvedValue({
      status: 'sent',
      messageId: 'wa-msg-1',
    });
    vi.mocked(MessageRepository.saveMessage).mockResolvedValue({
      id: 'msg-1',
    } as never);

    await redirectMessageToExternalWebhook({
      conversationId: 'conv-1',
      userId: 'user-1',
      wabaId: 'waba-1',
      messages: messageHistory('I need a human'),
    });

    expect(
      ConversationRepository.updateAdminTakeoverStatus,
    ).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      adminTakeover: true,
    });
    expect(
      vi.mocked(ConversationRepository.updateAdminTakeoverStatus).mock
        .invocationCallOrder[0],
    ).toBeLessThan(
      vi.mocked(MetaFetchService.sendMessage).mock.invocationCallOrder[0],
    );
  });

  it('emits a complete public conversation without sensitive bot metadata', async () => {
    const eventName = getUserEvent(SSE_EVENTS.NEW_MESSAGE, 'user-1');
    eventBus.on(eventName, vi.fn());
    vi.mocked(WebhookRepository.findWebhookByConversationId).mockResolvedValue({
      url: 'https://bot.example.com/message',
      passphrase: 'encrypted-passphrase',
      isActive: true,
    });
    vi.mocked(betterFetch).mockResolvedValue({
      data: { botResponse: 'bot reply', adminTakeover: false },
      error: null,
    } as never);
    vi.mocked(MetaFetchService.sendMessage).mockResolvedValue({
      status: 'sent',
      messageId: 'wa-msg-1',
    });
    vi.mocked(MessageRepository.saveMessage).mockResolvedValue({
      id: 'msg-1',
    } as never);

    await redirectMessageToExternalWebhook({
      conversationId: 'conv-1',
      userId: 'user-1',
      wabaId: 'waba-1',
      messages: messageHistory('hello'),
    });

    expect(eventBus.emit).toHaveBeenCalledWith(
      eventName,
      expect.objectContaining({
        conversation: {
          id: 'conv-1',
          customerPhone: '+123456',
          customerName: 'Test Customer',
          customerUsername: null,
          contactIdentifier: '+123456',
          displayName: 'Test Customer',
          adminTakeover: false,
          lastMessageAt: new Date('2026-06-24T10:00:00.000Z'),
          lastCustomerMessageAt: new Date('2026-06-24T09:00:00.000Z'),
          unreadCount: 2,
          status: 'active',
          createdAt: new Date('2026-06-23T10:00:00.000Z'),
          updatedAt: new Date('2026-06-24T10:00:00.000Z'),
          freeformWindowEndsAt: new Date('2026-06-25T09:00:00.000Z'),
          phoneNumber: {
            id: 'phone-1',
            displayPhoneNumber: '+654321',
          },
        },
        userId: 'user-1',
        wabaId: 'waba-1',
      }),
    );

    const emittedPayload = vi
      .mocked(eventBus.emit)
      .mock.calls.find(([name]) => name === eventName)?.[1];
    const serializedPayload = JSON.stringify(emittedPayload);

    expect(serializedPayload).not.toContain('systemUserToken');
    expect(serializedPayload).not.toContain('encrypted-token');
    expect(serializedPayload).not.toContain('phoneNumberId');
  });

  it('returns undefined when webhook URL and passphrase are missing', async () => {
    vi.mocked(WebhookRepository.findWebhookByConversationId).mockResolvedValue({
      url: undefined,
      passphrase: undefined,
      isActive: true,
    });

    const result = await redirectMessageToExternalWebhook({
      conversationId: 'conv-1',
      userId: 'user-1',
      wabaId: 'waba-1',
      messages: messageHistory('hello'),
    });

    expect(result).toBeUndefined();
    expect(betterFetch).not.toHaveBeenCalled();
    expect(
      ConversationRepository.updateAdminTakeoverStatus,
    ).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      adminTakeover: true,
    });
    expect(eventBus.emit).toHaveBeenCalledWith(
      getUserEvent(SSE_EVENTS.BOT_WEBHOOK_FAILED, 'user-1'),
      {
        conversationId: 'conv-1',
        wabaId: 'waba-1',
        adminTakeover: true,
      },
    );
  });

  it('does not call the external webhook when the configured webhook is inactive', async () => {
    vi.mocked(WebhookRepository.findWebhookByConversationId).mockResolvedValue({
      url: 'https://bot.example.com/message',
      passphrase: 'encrypted-passphrase',
      isActive: false,
    });

    const result = await redirectMessageToExternalWebhook({
      conversationId: 'conv-1',
      userId: 'user-1',
      wabaId: 'waba-1',
      messages: messageHistory('hello'),
    });

    expect(result).toBeUndefined();
    expect(betterFetch).not.toHaveBeenCalled();
    expect(
      ConversationRepository.updateAdminTakeoverStatus,
    ).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      adminTakeover: true,
    });
  });

  it('returns undefined and logs when the webhook response schema is invalid', async () => {
    const schemaError = new z.ZodError([]);
    vi.mocked(WebhookRepository.findWebhookByConversationId).mockResolvedValue({
      url: 'https://bot.example.com/message',
      passphrase: 'encrypted-passphrase',
      isActive: true,
    });
    vi.mocked(betterFetch).mockResolvedValue({
      data: null,
      error: schemaError,
    } as never);

    const result = await redirectMessageToExternalWebhook({
      conversationId: 'conv-1',
      userId: 'user-1',
      wabaId: 'waba-1',
      messages: messageHistory('hello'),
    });

    expect(result).toBeUndefined();
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Webhook response schema mismatch'),
      }),
      expect.objectContaining({
        conversationId: 'conv-1',
      }),
    );
    expect(
      ConversationRepository.updateAdminTakeoverStatus,
    ).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      adminTakeover: true,
    });
  });

  it('enables admin takeover after the webhook exhausts request retries', async () => {
    vi.mocked(WebhookRepository.findWebhookByConversationId).mockResolvedValue({
      url: 'https://bot.example.com/message',
      passphrase: 'encrypted-passphrase',
      isActive: true,
    });
    vi.mocked(betterFetch).mockResolvedValue({
      data: null,
      error: new Error('Service unavailable'),
    } as never);

    const result = await redirectMessageToExternalWebhook({
      conversationId: 'conv-1',
      userId: 'user-1',
      wabaId: 'waba-1',
      messages: messageHistory('hello'),
    });

    expect(result).toBeUndefined();
    expect(
      ConversationRepository.updateAdminTakeoverStatus,
    ).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      adminTakeover: true,
    });
    expect(eventBus.emit).toHaveBeenCalledWith(
      getUserEvent(SSE_EVENTS.BOT_WEBHOOK_FAILED, 'user-1'),
      expect.objectContaining({
        conversationId: 'conv-1',
        adminTakeover: true,
      }),
    );
  });
});
