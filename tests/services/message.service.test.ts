import { ApiError } from '@/lib/api-helper/error';
import eventBus, { SSE_EVENTS, getUserEvent } from '@/lib/chat/event-bus';
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
        messages: [{ id: 'msg-1', mediaSize: BigInt(123) }],
        total: 1,
      } as never);

      const result = await MessageService.getMessagesPaginated({
        convId: 'conv-1',
        wabaId: 'waba-1',
        userId: 'user-1',
        page: 1,
        limit: 10,
      });

      expect(result.messages).toEqual([{ id: 'msg-1', mediaSize: 123 }]);
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

  describe('sendAdminTextMessage', () => {
    it('sends message and saves to db', async () => {
      vi.mocked(
        ConversationRepository.getConversationMetaForSending,
      ).mockResolvedValue({
        lastCustomerMessageAt: new Date(),
        phoneNumber: {
          phoneNumberId: 'pn-1',
          waba: { systemUserToken: 'token', status: 'active' },
        },
        customerPhone: '+123456',
        contact: { bsuid: 'US.customer-123' },
      } as never);
      vi.mocked(MetaFetchService.sendMessage).mockResolvedValue({
        status: 'sent',
        messageId: 'wa-msg-1',
      });
      vi.mocked(MessageRepository.saveMessage).mockResolvedValue({
        id: 'msg-1',
      } as never);

      const result = await MessageService.sendAdminTextMessage({
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
      expect(MetaFetchService.sendMessage).toHaveBeenCalledWith({
        phoneNumberId: 'pn-1',
        token: 'token',
        recipient: 'US.customer-123',
        message: { type: 'text', text: 'Hello Admin' },
      });
      expect(MessageRepository.saveMessage).toHaveBeenCalled();
    });

    it('uses customer phone as to when BSUID is not available', async () => {
      vi.mocked(
        ConversationRepository.getConversationMetaForSending,
      ).mockResolvedValue({
        lastCustomerMessageAt: new Date(),
        phoneNumber: {
          phoneNumberId: 'pn-1',
          waba: { systemUserToken: 'token', status: 'active' },
        },
        contact: { customerPhone: '+123456' },
      } as never);
      vi.mocked(MetaFetchService.sendMessage).mockResolvedValue({
        status: 'sent',
        messageId: 'wa-msg-1',
      });
      vi.mocked(MessageRepository.saveMessage).mockResolvedValue({
        id: 'msg-1',
      } as never);

      await MessageService.sendAdminTextMessage({
        convId: 'conv-1',
        wabaId: 'waba-1',
        userId: 'user-1',
        content: 'Hello Admin',
      });

      expect(MetaFetchService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+123456',
        }),
      );
    });

    it('pauses sending when the WABA is disconnected', async () => {
      vi.mocked(
        ConversationRepository.getConversationMetaForSending,
      ).mockResolvedValue({
        lastCustomerMessageAt: new Date(),
        phoneNumber: {
          phoneNumberId: 'pn-1',
          waba: { systemUserToken: 'token', status: 'disconnected' },
        },
        contact: { customerPhone: '+123456' },
      } as never);

      await expect(
        MessageService.sendAdminTextMessage({
          convId: 'conv-1',
          wabaId: 'waba-1',
          userId: 'user-1',
          content: 'Hello Admin',
        }),
      ).rejects.toMatchObject({ status: 409 });

      expect(MetaFetchService.sendMessage).not.toHaveBeenCalled();
      expect(MessageRepository.saveMessage).not.toHaveBeenCalled();
    });

    it('pauses sending when the 24-hour customer service window is closed', async () => {
      vi.mocked(
        ConversationRepository.getConversationMetaForSending,
      ).mockResolvedValue({
        lastCustomerMessageAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        phoneNumber: {
          phoneNumberId: 'pn-1',
          waba: { systemUserToken: 'token', status: 'active' },
        },
        contact: { customerPhone: '+123456' },
      } as never);

      await expect(
        MessageService.sendAdminTextMessage({
          convId: 'conv-1',
          wabaId: 'waba-1',
          userId: 'user-1',
          content: 'Hello Admin',
        }),
      ).rejects.toMatchObject({
        status: 409,
        message:
          'Cannot send message because the 24-hour customer service window is closed.',
      });

      expect(MetaFetchService.sendMessage).not.toHaveBeenCalled();
      expect(MessageRepository.saveMessage).not.toHaveBeenCalled();
    });

    it('throws ApiError if chat meta is null', async () => {
      vi.mocked(
        ConversationRepository.getConversationMetaForSending,
      ).mockResolvedValue(null);
      await expect(
        MessageService.sendAdminTextMessage({
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
        lastCustomerMessageAt: new Date(),
        customerPhone: '+123456',
        contact: { bsuid: 'US.media-customer-123' },
        phoneNumber: {
          phoneNumberId: 'pn-1',
          wabaId: 'waba-1',
          waba: { systemUserToken: 'token', status: 'active' },
        },
      } as never);
      vi.mocked(S3Service.verifyUploadedMedia).mockResolvedValue({
        key: 'user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000',
        mediaType: 'image',
        mediaMimeType: 'image/png',
        mediaSize: 123,
      });
      vi.mocked(S3Service.createPresignedDownloadUrl).mockResolvedValue({
        downloadUrl: 'https://space.example/download?signature=abc',
        expiresIn: 1800,
      });
      vi.mocked(MetaFetchService.sendMessage).mockResolvedValue({
        status: 'sent',
        messageId: 'wa-media-msg-1',
      });
      vi.mocked(MessageRepository.saveMessage).mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
        direction: 'outgoing',
        source: 'admin',
        type: 'image',
        content: 'caption',
        mediaObjectKey:
          'user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000',
        mediaMimeType: 'image/png',
        mediaSize: 123,
        timestamp: new Date('2026-06-30T07:00:00.000Z'),
      } as never);

      const result = await MessageService.confirmUploadedMediaMessage({
        convId: 'conv-1',
        wabaId: 'waba-1',
        userId: 'user-1',
        key: 'user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000',
        caption: 'caption',
        filename: 'receipt.png',
      });

      expect(S3Service.verifyUploadedMedia).toHaveBeenCalledWith({
        userId: 'user-1',
        wabaId: 'waba-1',
        convId: 'conv-1',
        key: 'user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000',
      });
      expect(S3Service.createPresignedDownloadUrl).toHaveBeenCalledWith({
        userId: 'user-1',
        wabaId: 'waba-1',
        convId: 'conv-1',
        key: 'user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000',
      });
      expect(MetaFetchService.sendMessage).toHaveBeenCalledWith({
        phoneNumberId: 'pn-1',
        token: 'token',
        recipient: 'US.media-customer-123',
        message: {
          type: 'image',
          link: 'https://space.example/download?signature=abc',
          caption: 'caption',
        },
      });
      expect(MessageRepository.saveMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conv-1',
          direction: 'outgoing',
          source: 'admin',
          type: 'image',
          content: 'caption',
          status: 'sent',
          messageId: 'wa-media-msg-1',
          mediaObjectKey:
            'user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000',
          mediaMimeType: 'image/png',
          mediaFilename: 'receipt.png',
          mediaSize: 123,
          timestamp: expect.any(Date),
        }),
      );
      expect(result.message.mediaSize).toBe(123);
      expect(result.conversation.phoneNumber.waba).not.toHaveProperty(
        'systemUserToken',
      );
      expect(eventBus.emit).toHaveBeenCalledWith(
        getUserEvent(SSE_EVENTS.NEW_MESSAGE, 'user-1'),
        expect.objectContaining({
          id: 'msg-1',
          mediaSize: 123,
          mediaObjectKey:
            'user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000',
          userId: 'user-1',
          wabaId: 'waba-1',
        }),
      );
      const emittedPayload = vi.mocked(eventBus.emit).mock.calls[0]?.[1] as {
        conversation: { phoneNumber: { waba: Record<string, unknown> } };
      };
      expect(emittedPayload.conversation.phoneNumber.waba).not.toHaveProperty(
        'systemUserToken',
      );
      expect(
        vi.mocked(MetaFetchService.sendMessage).mock.invocationCallOrder[0],
      ).toBeLessThan(
        vi.mocked(MessageRepository.saveMessage).mock.invocationCallOrder[0],
      );
      expect(
        vi.mocked(MessageRepository.saveMessage).mock.invocationCallOrder[0],
      ).toBeLessThan(vi.mocked(eventBus.emit).mock.invocationCallOrder[0]);
    });

    it('rejects uploaded media confirmation when the WABA is not active', async () => {
      vi.mocked(
        ConversationRepository.getConversationMetaForSending,
      ).mockResolvedValue({
        id: 'conv-1',
        lastCustomerMessageAt: new Date(),
        contact: { bsuid: 'US.media-customer-123' },
        phoneNumber: {
          phoneNumberId: 'pn-1',
          wabaId: 'waba-1',
          waba: { systemUserToken: 'token', status: 'suspended' },
        },
      } as never);

      await expect(
        MessageService.confirmUploadedMediaMessage({
          convId: 'conv-1',
          wabaId: 'waba-1',
          userId: 'user-1',
          key: 'user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000',
        }),
      ).rejects.toMatchObject({
        status: 409,
        message:
          'Cannot send message because this WhatsApp Business account (WABA) is not active.',
      });

      expect(S3Service.verifyUploadedMedia).not.toHaveBeenCalled();
      expect(MetaFetchService.sendMessage).not.toHaveBeenCalled();
      expect(MessageRepository.saveMessage).not.toHaveBeenCalled();
    });

    it('rejects uploaded media confirmation when the 24-hour customer service window is closed', async () => {
      vi.mocked(
        ConversationRepository.getConversationMetaForSending,
      ).mockResolvedValue({
        id: 'conv-1',
        lastCustomerMessageAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        contact: { bsuid: 'US.media-customer-123' },
        phoneNumber: {
          phoneNumberId: 'pn-1',
          wabaId: 'waba-1',
          waba: { systemUserToken: 'token', status: 'active' },
        },
      } as never);

      await expect(
        MessageService.confirmUploadedMediaMessage({
          convId: 'conv-1',
          wabaId: 'waba-1',
          userId: 'user-1',
          key: 'user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000',
        }),
      ).rejects.toMatchObject({
        status: 409,
        message:
          'Cannot send message because the 24-hour customer service window is closed.',
      });

      expect(S3Service.verifyUploadedMedia).not.toHaveBeenCalled();
      expect(MetaFetchService.sendMessage).not.toHaveBeenCalled();
      expect(MessageRepository.saveMessage).not.toHaveBeenCalled();
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
          key: 'user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000',
        }),
      ).rejects.toThrow(ApiError);

      expect(S3Service.verifyUploadedMedia).not.toHaveBeenCalled();
      expect(MessageRepository.saveMessage).not.toHaveBeenCalled();
    });
  });
});
