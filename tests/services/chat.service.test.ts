import { ApiError } from '@/lib/error';
import { ChatRepository } from '@/repositories/chat.repository';
import { ChatService } from '@/services/chat.service';
import { WhatsappService } from '@/services/whatsapp.service';
import { describe, expect, it, vi } from 'vitest';

vi.unmock('@/services/chat.service');

/**
 * ChatService Tests
 * Reasoning: Tests business logic that validates tokens, formats webhook objects from Meta,
 * and handles missing data.
 */

describe('ChatService', () => {
  describe('getChatsByWabaId', () => {
    it('throws 404 if repository returns null (unauthorized)', async () => {
      vi.mocked(ChatRepository.findAllByWabaId).mockResolvedValue(null);
      await expect(
        ChatService.getChatsByWabaId('waba-1', 'user-1'),
      ).rejects.toThrow(ApiError);
    });

    it('returns chat list', async () => {
      vi.mocked(ChatRepository.findAllByWabaId).mockResolvedValue([
        { id: 'chat-1' },
      ] as never);
      const result = await ChatService.getChatsByWabaId('waba-1', 'user-1');
      expect(result).toEqual([{ id: 'chat-1' }]);
    });
  });

  describe('getChatDetail', () => {
    it('returns chat detail', async () => {
      const mockChat = { id: 'chat-1', title: 'Test Chat' };
      vi.mocked(ChatRepository.findById).mockResolvedValue(mockChat as never);
      const result = await ChatService.getChatDetail(
        'chat-1',
        'waba-1',
        'user-1',
      );
      expect(result).toEqual(mockChat);
    });

    it('throws 404 if chat not found', async () => {
      vi.mocked(ChatRepository.findById).mockResolvedValue(null);
      await expect(
        ChatService.getChatDetail('chat-1', 'waba-1', 'user-1'),
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
      vi.mocked(WhatsappService.sendTextMessage).mockResolvedValue({
        status: 'sent',
        messageId: 'wa-msg-1',
      });
      vi.mocked(ChatRepository.saveMessage).mockResolvedValue({
        id: 'msg-1',
      } as never);

      const result = await ChatService.sendAdminMessage(
        'chat-1',
        'user-1',
        'Hello Admin',
      );

      expect(result.id).toBe('msg-1');
      expect(WhatsappService.sendTextMessage).toHaveBeenCalledWith(
        'pn-1',
        'token',
        '+123456',
        'Hello Admin',
      );
      expect(ChatRepository.saveMessage).toHaveBeenCalled();
    });

    it('throws ApiError if chat meta is null', async () => {
      vi.mocked(ChatRepository.getChatMetaForSending).mockResolvedValue(null);
      await expect(
        ChatService.sendAdminMessage('chat-1', 'user-1', 'Hello'),
      ).rejects.toThrow(ApiError);
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
  });
});
