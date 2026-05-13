import { decrypt } from '@/lib/encryption';
import { ApiError } from '@/lib/error';
import eventBus, { SSE_EVENTS, getUserEvent } from '@/lib/event-bus';
import { logError, logger } from '@/lib/logger';
import { ConversationRepository } from '@/repositories/conversation.repository';
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
    convId: string;
    wabaId: string;
    userId: string;
    content: string;
  }) {
    const { convId, wabaId, userId, content } = params;
    logger.info('Admin sending message', { convId, wabaId, userId });

    // 1. Fetch metadata and validate ownership
    const conversationMeta =
      await ConversationRepository.getConversationMetaForSending({
        convId,
        wabaId,
        userId,
      });
    if (!conversationMeta) {
      logger.warn(
        'Conversation metadata fetch failed: not found or access denied',
        {
          convId,
          wabaId,
          userId,
        },
      );
      throw new ApiError('Conversation not found or access denied', 404);
    }

    const { phoneNumber, customerPhone } = conversationMeta;
    const { phoneNumberId } = phoneNumber;

    const tokenToUse = decrypt(phoneNumber.waba?.systemUserToken || '');

    if (!tokenToUse) {
      const apiError = new ApiError(
        'WhatsApp token is missing or invalid',
        403,
      );
      logError(apiError, {
        action: 'No WhatsApp token available for sending',
        convId,
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
      conversationId: convId,
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
      conversation: conversationMeta,
      userId,
      wabaId: conversationMeta.phoneNumber.wabaId,
    });

    return { message: savedMessage, conversation: conversationMeta };
  },
};
