import { decrypt } from '@/lib/encryption';
import { logError, logger } from '@/logger/logger';
import { ChatRepository } from '@/repositories/chat.repository';

import { WhatsappService } from './whatsapp.service';

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

  async sendAdminMessage(
    chatId: string,
    userId: string,
    content: string,
    requestToken?: string,
  ) {
    logger.info('Admin sending message', { chatId, userId });

    try {
      // 1. Fetch metadata and validate ownership
      const chatMeta = await ChatRepository.getChatMetaForSending(
        chatId,
        userId,
        !requestToken,
      );
      if (!chatMeta) {
        logger.warn('Chat meta fetch failed: Not found or access denied', {
          chatId,
          userId,
        });
        return null;
      }

      const { phoneNumber, customerPhone } = chatMeta;
      const { phoneNumberId } = phoneNumber;

      const tokenToUse = requestToken
        ? decrypt(requestToken)
        : decrypt(phoneNumber.waba?.systemUserToken || '');

      if (!tokenToUse) {
        logger.error('No WhatsApp token available for sending', { chatId });
        return null;
      }

      // 2. Send via WhatsApp API
      const waResult = await WhatsappService.sendTextMessage(
        phoneNumberId,
        tokenToUse,
        customerPhone,
        content,
      );

      // 3. Save to database
      const savedMessage = await ChatRepository.saveMessage({
        conversationId: chatId,
        direction: 'outgoing',
        source: 'admin',
        type: 'text',
        content,
        status: waResult.status,
        messageId: waResult.messageId,
        timestamp: new Date(),
      });

      return savedMessage;
    } catch (err) {
      logError(err, { action: 'sendAdminMessage', chatId, userId });
      throw err;
    }
  },
};
