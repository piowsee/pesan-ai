import { ApiError } from '@/lib/api-helper/error';
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

  describe('updateAdminTakeoverStatus', () => {
    it('checks conversation ownership before updating admin takeover', async () => {
      vi.mocked(ConversationRepository.findConversationById).mockResolvedValue({
        id: 'conv-1',
        adminTakeover: false,
        phoneNumber: { waba: { userId: 'user-1' } },
      } as never);
      vi.mocked(
        ConversationRepository.updateAdminTakeoverStatus,
      ).mockResolvedValue({
        id: 'conv-1',
        adminTakeover: true,
      });

      const result = await ConversationService.updateAdminTakeoverStatus({
        conversationId: 'conv-1',
        userId: 'user-1',
        adminTakeover: true,
      });

      expect(result).toEqual({
        conversationId: 'conv-1',
        adminTakeover: true,
      });
      expect(ConversationRepository.findConversationById).toHaveBeenCalledWith({
        conversationId: 'conv-1',
      });
      expect(
        ConversationRepository.updateAdminTakeoverStatus,
      ).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        adminTakeover: true,
      });
    });

    it('throws ApiError when conversation is not owned by the user', async () => {
      vi.mocked(ConversationRepository.findConversationById).mockResolvedValue({
        id: 'conv-1',
        adminTakeover: false,
        phoneNumber: { waba: { userId: 'other-user' } },
      } as never);

      await expect(
        ConversationService.updateAdminTakeoverStatus({
          conversationId: 'conv-1',
          userId: 'user-1',
          adminTakeover: true,
        }),
      ).rejects.toThrow(ApiError);

      expect(
        ConversationRepository.updateAdminTakeoverStatus,
      ).not.toHaveBeenCalled();
    });
  });
});
