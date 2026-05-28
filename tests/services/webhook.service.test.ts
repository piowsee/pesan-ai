import { encrypt } from '@/lib/encryption';
import { ApiError } from '@/lib/error';
import eventBus, { SSE_EVENTS, getUserEvent } from '@/lib/event-bus';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { MessageRepository } from '@/repositories/message.repository';
import { WebhookRepository } from '@/repositories/webhook.repository';
import { MetaFetchService } from '@/services/meta-fetch.service';
import { WebhookService } from '@/services/webhook.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/services/webhook.service');

/**
 * WebhookService Tests
 * Reasoning: Test the external API fetching behavior, token generation for webhooks
 * and formatting responses.
 */

describe('WebhookService', { tags: ['backend'] }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('callWebhook', () => {
    it('calls webhook successfully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const result = await WebhookService.callWebhook({
        url: 'https://example.com',
        passphrase: 'pass',
        method: 'GET',
      });
      expect(result.ok).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });

    it('throws ApiError on failed response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
      });

      await expect(
        WebhookService.callWebhook({
          url: 'https://example.com',
          passphrase: 'pass',
          method: 'POST',
          payload: {},
        }),
      ).rejects.toThrow(ApiError);
    });
  });

  describe('createWebhook', () => {
    it('creates and returns webhook mapping', async () => {
      vi.mocked(WebhookRepository.createWebhook).mockResolvedValue({
        id: 'wh-1',
        name: 'WH',
        webhookUrl: 'url',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user-1',
      } as never);

      const result = await WebhookService.createWebhook({
        userId: 'user-1',
        data: {
          name: 'WH',
          webhookUrl: 'url',
          passphrase: 'pass',
        },
      });

      expect(result.id).toBe('wh-1');
      expect(encrypt).toHaveBeenCalledWith('pass');
      expect(WebhookRepository.createWebhook).toHaveBeenCalled();
    });
  });

  describe('processIncomingMessageBotReply', () => {
    it('sends the bot reply, saves it, and emits SSE when eligible', async () => {
      const webhookResponse = { message: 'Bot says hello' };

      vi.mocked(ConversationRepository.getBotReplyContext).mockResolvedValue({
        id: 'conv-1',
        customerPhone: '+628111',
        adminTakeover: false,
        phoneNumber: {
          wabaId: 'waba-db-1',
          phoneNumberId: 'meta-phone-1',
          displayPhoneNumber: '+628222',
          botEnabled: true,
          botWebhook: {
            id: 'webhook-1',
            name: 'Bot',
            webhookUrl: 'https://bot.example.com',
            passphrase: 'enc-passphrase',
            isActive: true,
          },
          waba: {
            id: 'waba-db-1',
            userId: 'user-1',
            systemUserToken: 'enc-meta-token',
          },
        },
      } as never);

      vi.spyOn(WebhookService, 'sendMessageToWebhook').mockResolvedValue(
        webhookResponse,
      );
      vi.mocked(MetaFetchService.sendTextMessage).mockResolvedValue({
        messageId: 'wamid.bot.1',
        status: 'sent',
      });
      vi.mocked(MessageRepository.saveMessage).mockResolvedValue({
        id: 'msg-bot-1',
        content: 'Bot says hello',
      } as never);

      const result = await WebhookService.processIncomingMessageBotReply({
        conversationId: 'conv-1',
        incomingMessage: 'Hello there',
      });

      expect(result).toEqual({
        processed: true,
        message: {
          id: 'msg-bot-1',
          content: 'Bot says hello',
        },
      });
      expect(WebhookService.sendMessageToWebhook).toHaveBeenCalledWith({
        url: 'https://bot.example.com',
        passphrase: 'enc-passphrase',
        payload: {
          phoneNumber: '+628222',
          message: 'Hello there',
        },
      });
      expect(MetaFetchService.sendTextMessage).toHaveBeenCalledWith({
        phoneNumberId: 'meta-phone-1',
        token: 'enc-meta-token',
        to: '+628111',
        text: 'Bot says hello',
      });
      expect(MessageRepository.saveMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conv-1',
          direction: 'outgoing',
          source: 'bot',
          type: 'text',
          content: 'Bot says hello',
          status: 'sent',
          messageId: 'wamid.bot.1',
          metadata: JSON.stringify({
            webhookResponse,
          }),
        }),
      );
      expect(eventBus.emit).toHaveBeenCalledWith(
        getUserEvent(SSE_EVENTS.NEW_MESSAGE, 'user-1'),
        expect.objectContaining({
          id: 'msg-bot-1',
          userId: 'user-1',
          wabaId: 'waba-db-1',
          conversation: expect.objectContaining({
            id: 'conv-1',
          }),
        }),
      );
    });

    it('skips the bot flow when the phone number is not eligible', async () => {
      vi.mocked(ConversationRepository.getBotReplyContext).mockResolvedValue({
        id: 'conv-1',
        customerPhone: '+628111',
        adminTakeover: false,
        phoneNumber: {
          wabaId: 'waba-db-1',
          phoneNumberId: 'meta-phone-1',
          displayPhoneNumber: '+628222',
          botEnabled: false,
          botWebhook: {
            id: 'webhook-1',
            name: 'Bot',
            webhookUrl: 'https://bot.example.com',
            passphrase: 'enc-passphrase',
            isActive: true,
          },
          waba: {
            id: 'waba-db-1',
            userId: 'user-1',
            systemUserToken: 'enc-meta-token',
          },
        },
      } as never);

      const result = await WebhookService.processIncomingMessageBotReply({
        conversationId: 'conv-1',
        incomingMessage: 'Hello there',
      });

      expect(result).toEqual({
        processed: false,
        reason: 'Bot is not eligible',
      });
      expect(MetaFetchService.sendTextMessage).not.toHaveBeenCalled();
      expect(MessageRepository.saveMessage).not.toHaveBeenCalled();
      expect(eventBus.emit).not.toHaveBeenCalled();
    });

    it('returns a failed result when the webhook response has no reply text', async () => {
      vi.mocked(ConversationRepository.getBotReplyContext).mockResolvedValue({
        id: 'conv-1',
        customerPhone: '+628111',
        adminTakeover: false,
        phoneNumber: {
          wabaId: 'waba-db-1',
          phoneNumberId: 'meta-phone-1',
          displayPhoneNumber: '+628222',
          botEnabled: true,
          botWebhook: {
            id: 'webhook-1',
            name: 'Bot',
            webhookUrl: 'https://bot.example.com',
            passphrase: 'enc-passphrase',
            isActive: true,
          },
          waba: {
            id: 'waba-db-1',
            userId: 'user-1',
            systemUserToken: 'enc-meta-token',
          },
        },
      } as never);

      vi.spyOn(WebhookService, 'sendMessageToWebhook').mockResolvedValue({
        ok: true,
      });

      const result = await WebhookService.processIncomingMessageBotReply({
        conversationId: 'conv-1',
        incomingMessage: 'Hello there',
      });

      expect(result).toEqual({
        processed: false,
        reason: 'Bot reply failed',
      });
      expect(MetaFetchService.sendTextMessage).not.toHaveBeenCalled();
      expect(MessageRepository.saveMessage).not.toHaveBeenCalled();
    });
  });
});
