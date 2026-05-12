import { ApiError } from '@/lib/error';
import { ChatRepository } from '@/repositories/chat.repository';
import { MessageRepository } from '@/repositories/message.repository';
import { MessageService } from '@/services/message.service';
import { MetaFetchService } from '@/services/meta-fetch.service';
import { describe, expect, it, vi } from 'vitest';

vi.unmock('@/services/message.service');

describe('MessageService', { tags: ['backend'] }, () => {
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
      vi.mocked(ChatRepository.getChatMetaForSending).mockResolvedValue({
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
        chatId: 'chat-1',
        userId: 'user-1',
        content: 'Hello Admin',
      });

      expect(result.message.id).toBe('msg-1');
      expect(MetaFetchService.sendTextMessage).toHaveBeenCalledWith({
        phoneNumberId: 'pn-1',
        token: 'token',
        to: '+123456',
        text: 'Hello Admin',
      });
      expect(MessageRepository.saveMessage).toHaveBeenCalled();
    });

    it('throws ApiError if chat meta is null', async () => {
      vi.mocked(ChatRepository.getChatMetaForSending).mockResolvedValue(null);
      await expect(
        MessageService.sendAdminMessage({
          chatId: 'chat-1',
          userId: 'user-1',
          content: 'Hello',
        }),
      ).rejects.toThrow(ApiError);
    });
  });
});
