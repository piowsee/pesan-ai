import { ApiError } from '@/lib/api-helper/error';
import eventBus, { SSE_EVENTS, getUserEvent } from '@/lib/chat/event-bus';
import { handleDebounceIncomingMessage } from '@/lib/server/debounce-message-manager';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { MessageRepository } from '@/repositories/message.repository';
import { MessageService } from '@/services/message.service';
import { MetaFetchService } from '@/services/meta-fetch.service';
import { S3Service } from '@/services/s3.service';
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

  describe('confirmUploadedMediaMessage', () => {
    it('verifies object storage, saves a media message, and emits realtime update', async () => {
      vi.mocked(
        ConversationRepository.getConversationMetaForSending,
      ).mockResolvedValue({
        id: 'conv-1',
        phoneNumber: {
          wabaId: 'waba-1',
        },
      } as never);
      vi.mocked(S3Service.verifyUploadedMedia).mockResolvedValue({
        key: '/user-1/550e8400-e29b-41d4-a716-446655440000',
        mediaType: 'image',
        mediaMimeType: 'image/png',
        mediaSize: 123,
      });
      vi.mocked(MessageRepository.saveMessage).mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
        direction: 'outgoing',
        source: 'admin',
        type: 'image',
        content: 'caption',
        mediaUrl: '/user-1/550e8400-e29b-41d4-a716-446655440000',
        mediaMimeType: 'image/png',
        mediaSize: 123,
        timestamp: new Date('2026-06-30T07:00:00.000Z'),
      } as never);

      const result = await MessageService.confirmUploadedMediaMessage({
        convId: 'conv-1',
        wabaId: 'waba-1',
        userId: 'user-1',
        key: '/user-1/550e8400-e29b-41d4-a716-446655440000',
        caption: 'caption',
      });

      expect(S3Service.verifyUploadedMedia).toHaveBeenCalledWith({
        userId: 'user-1',
        key: '/user-1/550e8400-e29b-41d4-a716-446655440000',
      });
      expect(MessageRepository.saveMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conv-1',
          direction: 'outgoing',
          source: 'admin',
          type: 'image',
          content: 'caption',
          status: 'sent',
          mediaUrl: '/user-1/550e8400-e29b-41d4-a716-446655440000',
          mediaMimeType: 'image/png',
          mediaSize: 123,
          timestamp: expect.any(Date),
        }),
      );
      expect(result.message.mediaSize).toBe('123');
      expect(eventBus.emit).toHaveBeenCalledWith(
        getUserEvent(SSE_EVENTS.NEW_MESSAGE, 'user-1'),
        expect.objectContaining({
          id: 'msg-1',
          mediaSize: '123',
          mediaUrl: '/user-1/550e8400-e29b-41d4-a716-446655440000',
          userId: 'user-1',
          wabaId: 'waba-1',
        }),
      );
    });

    it('throws ApiError when the conversation is not owned by the user', async () => {
      vi.mocked(
        ConversationRepository.getConversationMetaForSending,
      ).mockResolvedValue(null);

      await expect(
        MessageService.confirmUploadedMediaMessage({
          convId: 'conv-1',
          wabaId: 'waba-1',
          userId: 'user-1',
          key: '/user-1/550e8400-e29b-41d4-a716-446655440000',
        }),
      ).rejects.toThrow(ApiError);

      expect(S3Service.verifyUploadedMedia).not.toHaveBeenCalled();
      expect(MessageRepository.saveMessage).not.toHaveBeenCalled();
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

    it('stores WhatsApp Business App message echoes with a distinct source', async () => {
      vi.mocked(
        ConversationRepository.findPhoneNumberByMetaId,
      ).mockResolvedValue({ id: 'phone-1' } as never);
      vi.mocked(
        ConversationRepository.processOutgoingMessageEcho,
      ).mockResolvedValue({
        message: {
          id: 'db-message-1',
          direction: 'outgoing',
          source: 'whatsapp_app',
          content: 'Ou',
        },
        conversation: { id: 'conversation-1' },
        userId: 'user-1',
        wabaId: 'waba-1',
      } as never);

      const result = await MessageService.processMetaWebhookPayload({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '1055765170435443',
            changes: [
              {
                field: 'smb_message_echoes',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '6285195563454',
                    phone_number_id: '1120639457807711',
                  },
                  contacts: [
                    {
                      wa_id: '628116150122',
                      user_id: 'ID.1728689754990890',
                    },
                  ],
                  message_echoes: [
                    {
                      from: '6285195563454',
                      to: '628116150122',
                      id: 'wamid.echo-1',
                      to_user_id: 'ID.1728689754990890',
                      timestamp: '1782640182',
                      text: { body: 'Ou' },
                      type: 'text',
                    },
                  ],
                },
              },
            ],
          },
        ],
      });

      expect(result).toEqual({ processed: true, count: 1 });
      expect(
        ConversationRepository.processOutgoingMessageEcho,
      ).toHaveBeenCalledWith({
        phoneNumberId: 'phone-1',
        customerPhone: '628116150122',
        customerName: undefined,
        message: {
          messageId: 'wamid.echo-1',
          type: 'text',
          content: 'Ou',
          timestamp: new Date(1782640182 * 1000),
          metadata: expect.any(String),
        },
      });
      expect(
        ConversationRepository.processIncomingMessage,
      ).not.toHaveBeenCalled();
      expect(handleDebounceIncomingMessage).not.toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith(
        getUserEvent(SSE_EVENTS.NEW_MESSAGE, 'user-1'),
        expect.objectContaining({
          id: 'db-message-1',
          direction: 'outgoing',
          source: 'whatsapp_app',
        }),
      );
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

      expect(handleDebounceIncomingMessage).toHaveBeenCalledWith('conv-1');

      // Clean up the listener
      eventBus.off(userEventName, mockSseListener);
    });

    it('queues the conversation when saved text content is missing', async () => {
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

      expect(handleDebounceIncomingMessage).toHaveBeenCalledWith('conv-1');
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
