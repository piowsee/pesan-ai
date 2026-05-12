import { decrypt } from '@/lib/encryption';
import { ApiError } from '@/lib/error';
import eventBus, { SSE_EVENTS, getUserEvent } from '@/lib/event-bus';
import { logError, logger } from '@/lib/logger';
import { ChatRepository } from '@/repositories/chat.repository';
import { MessageRepository } from '@/repositories/message.repository';

import { MetaFetchService } from './meta-fetch.service';

export const MessageService = {
  async getMessagesPaginated(params: {
    convId: string;
    wabaId: string;
    userId: string;
    page: number;
    limit: number;
  }) {
    const { convId, wabaId, userId, page, limit } = params;
    logger.info('Fetching paginated messages for conversation', {
      convId,
      page,
      limit,
    });

    const offset = (page - 1) * limit;
    const result = await MessageRepository.findMessagesPaginated({
      convId,
      wabaId,
      userId,
      limit,
      offset,
    });

    if (!result) {
      throw new ApiError('Conversation not found or access denied', 404);
    }

    return result;
  },

  async sendAdminMessage(params: {
    chatId: string;
    userId: string;
    content: string;
  }) {
    const { chatId, userId, content } = params;
    logger.info('Admin sending message', { chatId, userId });

    // 1. Fetch metadata and validate ownership
    const chatMeta = await ChatRepository.getChatMetaForSending({
      convId: chatId,
      userId,
    });
    if (!chatMeta) {
      logger.warn('Chat meta fetch failed: Not found or access denied', {
        chatId,
        userId,
      });
      throw new ApiError('Chat not found or access denied', 404);
    }

    const { phoneNumber, customerPhone } = chatMeta;
    const { phoneNumberId } = phoneNumber;

    const tokenToUse = decrypt(phoneNumber.waba?.systemUserToken || '');

    if (!tokenToUse) {
      const apiError = new ApiError(
        'WhatsApp token is missing or invalid',
        403,
      );
      logError(apiError, {
        action: 'No WhatsApp token available for sending',
        chatId,
      });

      throw apiError;
    }

    // 2. Send via WhatsApp API
    const waResult = await MetaFetchService.sendTextMessage({
      phoneNumberId,
      token: tokenToUse,
      to: customerPhone,
      text: content,
    });

    // 3. Save to database via MessageRepository
    const savedMessage = await MessageRepository.saveMessage({
      conversationId: chatId,
      direction: 'outgoing',
      source: 'admin',
      type: 'text',
      content,
      status: waResult.status,
      messageId: waResult.messageId,
      timestamp: new Date(),
    });

    // Emit real-time event via SSE to the specific user channel
    eventBus.emit(getUserEvent(SSE_EVENTS.NEW_MESSAGE, userId), {
      ...savedMessage,
      conversation: chatMeta,
      userId,
      wabaId: chatMeta.phoneNumber.wabaId,
    });

    return { message: savedMessage, conversation: chatMeta };
  },
};
