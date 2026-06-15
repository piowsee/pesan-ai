import { logger } from '@/lib/server/logger';
import { ConversationRepository } from '@/repositories/conversation.repository';

export const ConversationService = {
  async getAllConversations(params: { wabaId: string; userId: string }) {
    const { wabaId, userId } = params;
    logger.info('Fetching all conversations for WABA without pagination', {
      wabaId,
      userId,
    });

    const { conversations } = await ConversationRepository.findAllByWabaId({
      wabaId,
      userId,
    });
    logger.info('Conversation list fetched successfully', {
      wabaId,
      userId,
      count: conversations.length,
    });
    return { conversations, total: conversations.length };
  },

  async markAsRead(params: { convId: string; wabaId: string; userId: string }) {
    const { convId, wabaId, userId } = params;
    logger.info('Marking conversation as read', { convId, wabaId, userId });

    const result = await ConversationRepository.markConversationAsRead({
      convId,
      wabaId,
      userId,
    });
    logger.info('Mark as read completed', {
      convId,
      wabaId,
      userId,
      ...result,
    });
    return result;
  },
};
