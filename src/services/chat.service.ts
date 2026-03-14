import { logError, logger } from '@/logger/logger';
import { ChatRepository } from '@/repositories/chat.repository';

export const ChatService = {
  async getChatsByWabaId(wabaId: string, userId: string) {
    logger.info('Fetching chat list for WABA', { wabaId, userId });

    try {
      const chatList = await ChatRepository.findAllByWabaId(wabaId, userId);

      if (chatList === null) {
        logger.warn('Chat list fetch failed: WABA not found or access denied', {
          wabaId,
          userId,
        });
        return null;
      }

      logger.info('Chat list fetched successfully', {
        wabaId,
        userId,
        count: chatList.length,
      });
      return chatList;
    } catch (err) {
      logError(err, { action: 'getChatsByWabaId', wabaId, userId });
      throw err;
    }
  },
};
