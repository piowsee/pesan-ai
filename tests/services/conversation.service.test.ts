import { ConversationRepository } from '@/repositories/conversation.repository';
import { ConversationService } from '@/services/conversation.service';
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
