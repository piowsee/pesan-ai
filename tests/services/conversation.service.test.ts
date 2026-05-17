import eventBus, { SSE_EVENTS, getUserEvent } from '@/lib/event-bus';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { ConversationService } from '@/services/conversation.service';
import { WebhookService } from '@/services/webhook.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/services/conversation.service');

/**
 * ConversationService Tests
 * Reasoning: Tests business logic that validates tokens, formats webhook objects from Meta,
 * and handles missing data.
 */

describe('ConversationService', { tags: ['backend'] }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllConversations', () => {
    it('returns all conversation list', async () => {
      vi.mocked(ConversationRepository.findAllByWabaId).mockResolvedValue({
        conversations: [{ id: 'conv-1' }],
      } as never);
      const result = await ConversationService.getAllConversations({
        wabaId: 'waba-1',
        userId: 'user-1',
      });
      expect(result.conversations).toEqual([{ id: 'conv-1' }]);
      expect(result.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('processMetaWebhookPayload', () => {
    it('processes payload correctly', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [],
      };

      const result =
        await ConversationService.processMetaWebhookPayload(payload);
      expect(result.processed).toBe(true);
      expect(result.count).toBe(0);
    });

    it('throws error for invalid webhook payload', async () => {
      const payload = {
        object: 'page',
        entry: [],
      };
      await expect(
        ConversationService.processMetaWebhookPayload(payload),
      ).rejects.toThrow('Invalid Webhook Payload');
    });

    it('emits NEW_MESSAGE event to targeted user channel (simulated SSE connection)', async () => {
      const testUserId = 'user-123';
      const userEventName = getUserEvent(SSE_EVENTS.NEW_MESSAGE, testUserId);
      const mockSseListener = vi.fn();

      // Subscribe to the event (uses the global spied EventEmitter from setup.ts)
      eventBus.on(userEventName, mockSseListener);

      // Mock repository calls
      vi.mocked(
        ConversationRepository.findPhoneNumberByMetaId,
      ).mockResolvedValue({
        id: 'phone-1',
      } as never);

      vi.mocked(
        ConversationRepository.processIncomingMessage,
      ).mockResolvedValue({
        message: { id: 'msg-1', content: 'hello' },
        conversation: { id: 'conv-1' },
        userId: testUserId,
      } as never);

      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '12345',
                    phone_number_id: 'meta-phone-1',
                  },
                  messages: [
                    {
                      id: 'meta-msg-1',
                      from: 'customer-1',
                      type: 'text',
                      text: { body: 'hello' },
                      timestamp: '1625097600',
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await ConversationService.processMetaWebhookPayload(payload);

      // Verify overall emission call
      expect(eventBus.emit).toHaveBeenCalledWith(
        userEventName,
        expect.objectContaining({ id: 'msg-1' }),
      );

      // Verify the simulated SSE "connection" (listener) received the data
      expect(mockSseListener).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'msg-1',
          content: 'hello',
          conversation: { id: 'conv-1' },
          userId: testUserId,
        }),
      );

      expect(WebhookService.queueIncomingMessageBotReply).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        incomingMessage: 'hello',
      });

      // Clean up the listener
      eventBus.off(userEventName, mockSseListener);
    });
  });

  describe('markAsRead', () => {
    it('passes WABA ownership context to the repository', async () => {
      vi.mocked(
        ConversationRepository.markConversationAsRead,
      ).mockResolvedValue({
        updated: true,
      });

      const result = await ConversationService.markAsRead({
        convId: 'conv-1',
        wabaId: 'waba-1',
        userId: 'user-1',
      });

      expect(result).toEqual({ updated: true });
      expect(
        ConversationRepository.markConversationAsRead,
      ).toHaveBeenCalledWith({
        convId: 'conv-1',
        wabaId: 'waba-1',
        userId: 'user-1',
      });
    });
  });
});
