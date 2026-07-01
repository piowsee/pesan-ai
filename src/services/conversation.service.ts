import { ApiError } from '@/lib/api-helper/error';
import { logger } from '@/lib/server/logger';
import { ConversationRepository } from '@/repositories/conversation.repository';

// wabaId in this service is the internal DB WhatsappBusinessAccount.id.
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

  async updateAdminTakeoverStatus(params: {
    conversationId: string;
    userId: string;
    adminTakeover: boolean;
  }) {
    const { conversationId, userId, adminTakeover } = params;
    logger.info('Updating conversation admin takeover', {
      conversationId,
      userId,
      adminTakeover,
    });

    const conversation = await ConversationRepository.findConversationById({
      conversationId,
    });

    if (!conversation || conversation.phoneNumber.waba.userId !== userId) {
      throw new ApiError('Conversation not found or access denied', 404);
    }

    const updated = await ConversationRepository.updateAdminTakeoverStatus({
      conversationId,
      adminTakeover,
    });

    logger.info('Conversation admin takeover updated', {
      conversationId,
      userId,
      adminTakeover: updated.adminTakeover,
    });

    return {
      conversationId: updated.id,
      adminTakeover: updated.adminTakeover,
    };
  },
};
