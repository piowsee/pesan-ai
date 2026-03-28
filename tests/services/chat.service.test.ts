import { ChatRepository } from '@/repositories/chat.repository';
import { ChatService } from '@/services/chat.service';
import { describe, expect, it, vi } from 'vitest';

vi.unmock('@/services/chat.service');

/**
 * ChatService Tests
 * Reasoning: Tests business logic that validates tokens, formats webhook objects from Meta,
 * and handles missing data.
 */

describe('ChatService', { tags: ['backend'] }, () => {
  describe('getChatsPaginated', () => {
    it('returns paginated chat list', async () => {
      vi.mocked(ChatRepository.findPaginatedByWabaId).mockResolvedValue({
        chats: [{ id: 'chat-1' }],
        total: 1,
      } as never);
      const result = await ChatService.getChatsPaginated(
        'waba-1',
        'user-1',
        1,
        10,
      );
      expect(result.chats).toEqual([{ id: 'chat-1' }]);
      expect(result.total).toBeGreaterThanOrEqual(1);
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
