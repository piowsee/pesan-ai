import eventBus, { SSE_EVENTS, getUserEvent } from '@/lib/chat/event-bus';
import { decrypt } from '@/lib/server/encryption';
import { logError, logger } from '@/lib/server/logger';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { MessageRepository } from '@/repositories/message.repository';
import { WebhookRepository } from '@/repositories/webhook.repository';
import { MetaFetchService } from '@/services/meta-fetch.service';
import { redirectMessageToExternalWebhook } from '@/services/redirect-message.service';
import { betterFetch } from '@better-fetch/fetch';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import z from 'zod';

vi.unmock('@/services/redirect-message.service');
vi.mock('@better-fetch/fetch', () => ({
  betterFetch: vi.fn(),
}));

describe('redirectMessageToExternalWebhook', { tags: ['backend'] }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads active webhook data by conversation, decrypts the passphrase, and posts joined messages', async () => {
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
    vi.mocked(
      ConversationRepository.findConversationMetaForBotReply,
    ).mockResolvedValue({
      customerPhone: '+123456',
      phoneNumber: {
        phoneNumberId: 'meta-phone-1',
        wabaId: 'waba-1',
        waba: {
          systemUserToken: 'encrypted-token',
          userId: 'user-1',
        },
      },
    } as never);
    vi.mocked(MetaFetchService.sendTextMessage).mockResolvedValue({
      status: 'sent',
      messageId: 'wa-msg-1',
    });
    vi.mocked(MessageRepository.saveMessage).mockResolvedValue({
      id: 'msg-1',
    } as never);

    const result = await redirectMessageToExternalWebhook({
      conversationId: 'conv-1',
      messages: ['hello', 'need help'],
    });

    expect(result).toEqual({ botResponse: 'ok', adminTakeover: false });
    expect(WebhookRepository.findWebhookByConversationId).toHaveBeenCalledWith({
      conversationId: 'conv-1',
    });
    expect(decrypt).toHaveBeenCalledWith('encrypted-passphrase');
    expect(betterFetch).toHaveBeenCalledWith(
      'https://bot.example.com/message',
      expect.objectContaining({
        method: 'POST',
        auth: { type: 'Bearer', token: 'plain-passphrase' },
        body: { message: 'hello.need help' },
      }),
    );
    expect(
      ConversationRepository.updateAdminTakeoverStatus,
    ).not.toHaveBeenCalled();
    expect(MetaFetchService.sendTextMessage).toHaveBeenCalledWith({
      phoneNumberId: 'meta-phone-1',
      token: 'plain-token',
      to: '+123456',
      text: 'ok',
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

  it('does not clear an existing takeover when the bot returns false', async () => {
    const eventName = getUserEvent(SSE_EVENTS.NEW_MESSAGE, 'user-1');
    const listener = vi.fn();
    eventBus.on(eventName, listener);
    vi.mocked(WebhookRepository.findWebhookByConversationId).mockResolvedValue({
      url: 'https://bot.example.com/message',
      passphrase: 'encrypted-passphrase',
      isActive: true,
    });
    vi.mocked(betterFetch).mockResolvedValue({
      data: { botResponse: 'bot reply', adminTakeover: false },
      error: null,
    } as never);
    vi.mocked(
      ConversationRepository.findConversationMetaForBotReply,
    ).mockResolvedValue({
      id: 'conv-1',
      adminTakeover: true,
      customerPhone: '+123456',
      phoneNumber: {
        phoneNumberId: 'meta-phone-1',
        wabaId: 'waba-1',
        waba: {
          systemUserToken: 'encrypted-token',
          userId: 'user-1',
        },
      },
    } as never);
    vi.mocked(MetaFetchService.sendTextMessage).mockResolvedValue({
      status: 'sent',
      messageId: 'wa-msg-1',
    });
    vi.mocked(MessageRepository.saveMessage).mockResolvedValue({
      id: 'msg-1',
      content: 'bot reply',
    } as never);

    await redirectMessageToExternalWebhook({
      conversationId: 'conv-1',
      messages: ['hello'],
    });

    expect(
      ConversationRepository.updateAdminTakeoverStatus,
    ).not.toHaveBeenCalled();
    expect(eventBus.emit).toHaveBeenCalledWith(
      eventName,
      expect.objectContaining({
        id: 'msg-1',
        userId: 'user-1',
        wabaId: 'waba-1',
        conversation: expect.objectContaining({
          id: 'conv-1',
          adminTakeover: true,
        }),
      }),
    );
    eventBus.off(eventName, listener);
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
      ConversationRepository.findConversationMetaForBotReply,
    ).mockResolvedValue({
      id: 'conv-1',
      adminTakeover: true,
      customerPhone: '+123456',
      phoneNumber: {
        phoneNumberId: 'meta-phone-1',
        wabaId: 'waba-1',
        waba: {
          systemUserToken: 'encrypted-token',
          userId: 'user-1',
        },
      },
    } as never);
    vi.mocked(
      ConversationRepository.updateAdminTakeoverStatus,
    ).mockResolvedValue({
      id: 'conv-1',
      adminTakeover: true,
    });
    vi.mocked(MetaFetchService.sendTextMessage).mockResolvedValue({
      status: 'sent',
      messageId: 'wa-msg-1',
    });
    vi.mocked(MessageRepository.saveMessage).mockResolvedValue({
      id: 'msg-1',
    } as never);

    await redirectMessageToExternalWebhook({
      conversationId: 'conv-1',
      messages: ['I need a human'],
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
      vi.mocked(MetaFetchService.sendTextMessage).mock.invocationCallOrder[0],
    );
  });

  it('returns undefined when webhook URL and passphrase are missing', async () => {
    vi.mocked(WebhookRepository.findWebhookByConversationId).mockResolvedValue({
      url: undefined,
      passphrase: undefined,
      isActive: true,
    });

    const result = await redirectMessageToExternalWebhook({
      conversationId: 'conv-1',
      messages: ['hello'],
    });

    expect(result).toBeUndefined();
    expect(betterFetch).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('does not call the external webhook when the configured webhook is inactive', async () => {
    vi.mocked(WebhookRepository.findWebhookByConversationId).mockResolvedValue({
      url: 'https://bot.example.com/message',
      passphrase: 'encrypted-passphrase',
      isActive: false,
    });

    const result = await redirectMessageToExternalWebhook({
      conversationId: 'conv-1',
      messages: ['hello'],
    });

    expect(result).toBeUndefined();
    expect(betterFetch).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
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
      messages: ['hello'],
    });

    expect(result).toBeUndefined();
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Webhook response schema mismatch'),
      }),
    );
  });
});
