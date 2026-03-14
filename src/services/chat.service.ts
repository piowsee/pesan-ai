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

  async getChatDetail(convId: string, wabaId: string, userId: string) {
    logger.info('Fetching chat details', { convId, wabaId, userId });

    try {
      const chatDetail = await ChatRepository.findById(convId, wabaId, userId);

      if (chatDetail === null) {
        logger.warn('Chat detail fetch failed: Not found or access denied', {
          convId,
          wabaId,
          userId,
        });
        return null;
      }

      logger.info('Chat detail fetched successfully', {
        convId,
        wabaId,
        userId,
      });
      return chatDetail;
    } catch (err) {
      logError(err, { action: 'getChatDetail', convId, wabaId, userId });
      throw err;
    }
  },
};
