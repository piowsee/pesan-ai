import eventBus, { SSE_EVENTS, getUserEvent } from '@/lib/event-bus';
import { ChatRepository } from '@/repositories/chat.repository';
import { ChatService } from '@/services/chat.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/services/chat.service');

/**
 * ChatService Tests
 * Reasoning: Tests business logic that validates tokens, formats webhook objects from Meta,
 * and handles missing data.
 */

describe('ChatService', { tags: ['backend'] }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllChats', () => {
    it('returns all chat list', async () => {
      vi.mocked(ChatRepository.findAllByWabaId).mockResolvedValue({
        chats: [{ id: 'chat-1' }],
      } as never);
      const result = await ChatService.getAllChats({
        wabaId: 'waba-1',
        userId: 'user-1',
      });
      expect(result.chats).toEqual([{ id: 'chat-1' }]);
      expect(result.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('processMetaWebhookPayload', () => {
    it('processes payload correctly', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [],
      };

      const result = await ChatService.processMetaWebhookPayload(payload);
      expect(result.processed).toBe(true);
      expect(result.count).toBe(0);
    });

    it('throws error for invalid webhook payload', async () => {
      const payload = {
        object: 'page',
        entry: [],
      };
      await expect(
        ChatService.processMetaWebhookPayload(payload),
      ).rejects.toThrow('Invalid Webhook Payload');
    });

    it('emits NEW_MESSAGE event to targeted user channel (simulated SSE connection)', async () => {
      const testUserId = 'user-123';
      const userEventName = getUserEvent(SSE_EVENTS.NEW_MESSAGE, testUserId);
      const mockSseListener = vi.fn();

      // Subscribe to the event (uses the global spied EventEmitter from setup.ts)
      eventBus.on(userEventName, mockSseListener);

      // Mock repository calls
      vi.mocked(ChatRepository.findPhoneNumberByMetaId).mockResolvedValue({
        id: 'phone-1',
      } as never);

      vi.mocked(ChatRepository.processIncomingMessage).mockResolvedValue({
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

      await ChatService.processMetaWebhookPayload(payload);

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

      // Clean up the listener
      eventBus.off(userEventName, mockSseListener);
    });
  });
});
