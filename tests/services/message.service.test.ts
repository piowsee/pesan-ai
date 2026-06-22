import { ApiError } from '@/lib/api-helper/error';
import eventBus, { SSE_EVENTS, getUserEvent } from '@/lib/chat/event-bus';
import { handleDebounceIncomingMessage } from '@/lib/server/debounce-message-manager';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { MessageRepository } from '@/repositories/message.repository';
import { MessageService } from '@/services/message.service';
import { MetaFetchService } from '@/services/meta-fetch.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/services/message.service');

describe('MessageService', { tags: ['backend'] }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMessagesPaginated', () => {
    it('returns paginated messages', async () => {
      vi.mocked(MessageRepository.findMessagesPaginated).mockResolvedValue({
        messages: [{ id: 'msg-1' }],
        total: 1,
      } as never);

      const result = await MessageService.getMessagesPaginated({
        convId: 'conv-1',
        wabaId: 'waba-1',
        userId: 'user-1',
        page: 1,
        limit: 10,
      });

      expect(result.messages).toEqual([{ id: 'msg-1' }]);
      expect(result.total).toBe(1);
      expect(MessageRepository.findMessagesPaginated).toHaveBeenCalledWith({
        convId: 'conv-1',
        wabaId: 'waba-1',
        userId: 'user-1',
        limit: 10,
        offset: 0,
      });
    });

    it('throws ApiError if conversation is not found', async () => {
      vi.mocked(MessageRepository.findMessagesPaginated).mockResolvedValue(
        null,
      );

      await expect(
        MessageService.getMessagesPaginated({
          convId: 'conv-1',
          wabaId: 'waba-1',
          userId: 'user-1',
          page: 1,
          limit: 10,
        }),
      ).rejects.toThrow(ApiError);
    });
  });

  describe('sendAdminMessage', () => {
    it('sends message and saves to db', async () => {
      vi.mocked(
        ConversationRepository.getConversationMetaForSending,
      ).mockResolvedValue({
        phoneNumber: {
          phoneNumberId: 'pn-1',
          waba: { systemUserToken: 'token' },
        },
        customerPhone: '+123456',
      } as never);
      vi.mocked(MetaFetchService.sendTextMessage).mockResolvedValue({
        status: 'sent',
        messageId: 'wa-msg-1',
      });
      vi.mocked(MessageRepository.saveMessage).mockResolvedValue({
        id: 'msg-1',
      } as never);

      const result = await MessageService.sendAdminMessage({
        convId: 'conv-1',
        wabaId: 'waba-1',
        userId: 'user-1',
        content: 'Hello Admin',
      });

      expect(result.message.id).toBe('msg-1');
      expect(
        ConversationRepository.getConversationMetaForSending,
      ).toHaveBeenCalledWith({
        convId: 'conv-1',
        wabaId: 'waba-1',
        userId: 'user-1',
      });
      expect(MetaFetchService.sendTextMessage).toHaveBeenCalledWith({
        phoneNumberId: 'pn-1',
        token: 'token',
        to: '+123456',
        text: 'Hello Admin',
      });
      expect(MessageRepository.saveMessage).toHaveBeenCalled();
    });

    it('throws ApiError if chat meta is null', async () => {
      vi.mocked(
        ConversationRepository.getConversationMetaForSending,
      ).mockResolvedValue(null);
      await expect(
        MessageService.sendAdminMessage({
          convId: 'conv-1',
          wabaId: 'waba-1',
          userId: 'user-1',
          content: 'Hello',
        }),
      ).rejects.toThrow(ApiError);
    });
  });
  describe('processMetaWebhookPayload', () => {
    it('processes payload correctly', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [],
      };

      const result = await MessageService.processMetaWebhookPayload(payload);
      expect(result.processed).toBe(true);
      expect(result.count).toBe(0);
    });

    it('throws error for invalid webhook payload', async () => {
      const payload = {
        object: 'page',
        entry: [],
      };
      await expect(
        MessageService.processMetaWebhookPayload(payload),
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

      await MessageService.processMetaWebhookPayload(payload);

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

      expect(handleDebounceIncomingMessage).toHaveBeenCalledWith(
        'conv-1',
        'hello',
      );

      // Clean up the listener
      eventBus.off(userEventName, mockSseListener);
    });

    it('queues an empty redirect message when saved text content is missing', async () => {
      vi.mocked(
        ConversationRepository.findPhoneNumberByMetaId,
      ).mockResolvedValue({
        id: 'phone-1',
      } as never);

      vi.mocked(
        ConversationRepository.processIncomingMessage,
      ).mockResolvedValue({
        message: { id: 'msg-1', content: null },
        conversation: { id: 'conv-1' },
        userId: 'user-123',
      } as never);

      await MessageService.processMetaWebhookPayload({
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
                      timestamp: '1625097600',
                    },
                  ],
                },
              },
            ],
          },
        ],
      });

      expect(handleDebounceIncomingMessage).toHaveBeenCalledWith('conv-1', '');
    });

    it('does not queue redirect message when admin has taken over the conversation', async () => {
      vi.mocked(
        ConversationRepository.findPhoneNumberByMetaId,
      ).mockResolvedValue({
        id: 'phone-1',
      } as never);

      vi.mocked(
        ConversationRepository.processIncomingMessage,
      ).mockResolvedValue({
        message: { id: 'msg-1', content: 'manual please' },
        conversation: { id: 'conv-1', adminTakeover: true },
        userId: 'user-123',
      } as never);

      const result = await MessageService.processMetaWebhookPayload({
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
                      text: { body: 'manual please' },
                      timestamp: '1625097600',
                    },
                  ],
                },
              },
            ],
          },
        ],
      });

      expect(result).toEqual({ processed: true, count: 1 });
      expect(eventBus.emit).toHaveBeenCalledWith(
        getUserEvent(SSE_EVENTS.NEW_MESSAGE, 'user-123'),
        expect.objectContaining({
          id: 'msg-1',
          conversation: { id: 'conv-1', adminTakeover: true },
        }),
      );
      expect(handleDebounceIncomingMessage).not.toHaveBeenCalled();
    });
  });
});
