import { serializeDate } from '@/lib/chat';
import { publishChatEvent } from '@/lib/chat-events';
import { toChatConversation, toChatMessage } from '@/lib/chat-mappers';
import { decrypt } from '@/lib/encryption';
import { ApiError } from '@/lib/error';
import { logError, logger } from '@/logger/logger';
import { ChatRepository } from '@/repositories/chat.repository';
import {
  Contact,
  MetaWebhookPayload,
  MetaWebhookPayloadSchema,
  WebhookEntry,
  WebhookMessage,
  WebhookStatus,
  WebhookValue,
} from '@/schemas/webhook.schema';
import type { ChatMessageStatus, ChatSidebarFilter } from '@/types/chat';

import { WhatsappService } from './whatsapp.service';

export const ChatService = {
  async getChatsByWabaId(
    params:
      | {
          wabaId: string;
          userId: string;
          page: number;
          limit: number;
          search?: string;
          filter?: ChatSidebarFilter;
          phoneNumberId?: string;
        }
      | string,
    userIdArg?: string,
  ) {
    if (typeof params === 'string') {
      const chats = await ChatRepository.findAllByWabaId(
        params,
        userIdArg || '',
      );
      return chats.map(toChatConversation);
    }

    const { wabaId, userId, page, limit, search, filter, phoneNumberId } =
      params;

    logger.info('Fetching chat list for WABA', {
      wabaId,
      userId,
      page,
      limit,
      filter,
      phoneNumberId,
    });

    try {
      const { chats, total } = await ChatRepository.findPagedByWabaId({
        wabaId,
        userId,
        page,
        limit,
        search,
        filter,
        phoneNumberId,
      });

      return {
        chats: chats.map(toChatConversation),
        total,
        page,
        limit,
        hasNextPage: page * limit < total,
      };
    } catch (err) {
      logError(err, { action: 'getChatsByWabaId', wabaId, userId });
      throw err;
    }
  },

  async getChatDetail(convId: string, wabaId: string, userId: string) {
    logger.info('Fetching chat details', { convId, wabaId, userId });

    try {
      const chatDetail = await ChatRepository.findById(convId, wabaId, userId);
      if (!chatDetail) {
        throw new ApiError('Chat not found or access denied', 404);
      }

      return toChatConversation(chatDetail);
    } catch (err) {
      logError(err, { action: 'getChatDetail', convId, wabaId, userId });
      throw err;
    }
  },

  async getChatMessages(params: {
    convId: string;
    wabaId: string;
    userId: string;
    before?: Date;
    limit: number;
  }) {
    const { convId, wabaId, userId, before, limit } = params;

    logger.info('Fetching chat messages', {
      convId,
      wabaId,
      userId,
      limit,
      before: before?.toISOString(),
    });

    try {
      const fetchedMessages = await ChatRepository.findMessagesByConversationId(
        {
          convId,
          wabaId,
          userId,
          before,
          limit: limit + 1,
        },
      );

      const hasMore = fetchedMessages.length > limit;
      const visibleMessages = hasMore
        ? fetchedMessages.slice(1)
        : fetchedMessages;

      return {
        messages: visibleMessages.map(toChatMessage),
        nextBefore:
          hasMore && visibleMessages[0]
            ? serializeDate(visibleMessages[0].timestamp)
            : null,
        limit,
      };
    } catch (err) {
      logError(err, { action: 'getChatMessages', convId, wabaId, userId });
      throw err;
    }
  },

  async markConversationAsRead(convId: string, wabaId: string, userId: string) {
    logger.info('Marking chat as read', { convId, wabaId, userId });

    try {
      const result = await ChatRepository.markConversationAsRead(
        convId,
        wabaId,
        userId,
      );

      if (!result) {
        throw new ApiError('Chat not found or access denied', 404);
      }

      return result;
    } catch (err) {
      logError(err, {
        action: 'markConversationAsRead',
        convId,
        wabaId,
        userId,
      });
      throw err;
    }
  },

  async sendAdminMessage(
    chatId: string,
    wabaIdOrUserId: string,
    userIdOrContent: string,
    contentOrRequestToken?: string,
    requestToken?: string,
  ) {
    const isLegacySignature = contentOrRequestToken === undefined;
    const wabaId = isLegacySignature ? undefined : wabaIdOrUserId;
    const userId = isLegacySignature ? wabaIdOrUserId : userIdOrContent;
    const content = isLegacySignature
      ? userIdOrContent
      : contentOrRequestToken || '';

    logger.info('Admin sending message', { chatId, wabaId, userId });

    try {
      const chatMeta = await ChatRepository.getChatMetaForSending(
        chatId,
        wabaId,
        userId,
        !requestToken,
      );

      if (!chatMeta) {
        logger.warn('Chat meta fetch failed: Not found or access denied', {
          chatId,
          userId,
          wabaId,
        });
        throw new ApiError('Chat not found or access denied', 404);
      }

      const { phoneNumber, customerPhone } = chatMeta;
      const { phoneNumberId } = phoneNumber;

      const tokenToUse = requestToken
        ? decrypt(requestToken)
        : decrypt(phoneNumber.waba?.systemUserToken || '');

      if (!tokenToUse) {
        logger.error('No WhatsApp token available for sending', { chatId });
        throw new ApiError('WhatsApp token is missing or invalid', 403);
      }

      const waResult = await WhatsappService.sendTextMessage(
        phoneNumberId,
        tokenToUse,
        customerPhone,
        content,
      );

      const savedMessage = await ChatRepository.saveOutgoingMessage({
        conversationId: chatId,
        direction: 'outgoing',
        source: 'admin',
        type: 'text',
        content,
        status: waResult.status,
        messageId: waResult.messageId,
        timestamp: new Date(),
      });

      const conversation = toChatConversation(savedMessage.conversation);
      const message = toChatMessage(savedMessage.message);

      publishChatEvent({
        type: 'message',
        wabaId: wabaId ?? chatMeta.phoneNumber.wabaId,
        conversation,
        message,
      });

      const result = {
        conversation,
        message,
      };

      return isLegacySignature ? result.message : result;
    } catch (err) {
      logError(err, { action: 'sendAdminMessage', chatId, userId, wabaId });
      throw err;
    }
  },

  async processMetaWebhookPayload(payload: unknown) {
    logger.info('Processing Meta Webhook payload in ChatService');

    try {
      const parsedBody = this._validatePayload(payload);
      if (!parsedBody) {
        return { processed: false, reason: 'Invalid or ignored payload' };
      }

      const processedCount = await this._processEntries(parsedBody.entry || []);

      return { processed: true, count: processedCount };
    } catch (err) {
      logError(err, { action: 'processWebhookPayload' });
      throw err;
    }
  },

  _validatePayload(payload: unknown): MetaWebhookPayload | null {
    const parsed = MetaWebhookPayloadSchema.safeParse(payload);

    if (!parsed.success) {
      logger.warn('Invalid Meta Webhook payload structure', {
        errors: parsed.error.format(),
      });
      throw new Error('Invalid Webhook Payload');
    }

    const body = parsed.data;

    if (body.object !== 'whatsapp_business_account') {
      logger.info('Ignoring non-WABA webhook event', { object: body.object });
      return null;
    }

    return body;
  },

  async _processEntries(entries: WebhookEntry[]): Promise<number> {
    let processedCount = 0;

    for (const entry of entries) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;

        const changeProcessedCount = await this._processMessageChange(
          change.value,
        );
        processedCount += changeProcessedCount;
      }
    }

    return processedCount;
  },

  async _processMessageChange(value: WebhookValue): Promise<number> {
    const metaPhoneNumberId = value.metadata?.phone_number_id;
    if (!metaPhoneNumberId) return 0;

    const internalPhoneResult =
      await ChatRepository.findPhoneNumberByMetaId(metaPhoneNumberId);

    if (!internalPhoneResult) {
      logger.warn('Received message for unknown Meta Phone Number ID', {
        metaPhoneNumberId,
      });
      return 0;
    }

    const contactsMap = this._mapContacts(value.contacts);
    const incomingCount = await this._processMessagesList(
      value.messages,
      internalPhoneResult.id,
      contactsMap,
      internalPhoneResult.wabaId,
    );
    const statusCount = await this._processStatusesList(
      value.statuses,
      internalPhoneResult.wabaId,
    );

    return incomingCount + statusCount;
  },

  _mapContacts(contacts: Contact[] = []): Record<string, string> {
    const contactsMap: Record<string, string> = {};
    for (const contact of contacts) {
      if (contact.wa_id && contact.profile?.name) {
        contactsMap[contact.wa_id] = contact.profile.name;
      }
    }
    return contactsMap;
  },

  async _processMessagesList(
    messages: WebhookMessage[] = [],
    internalPhoneId: string,
    contactsMap: Record<string, string>,
    wabaId: string,
  ): Promise<number> {
    let count = 0;

    for (const message of messages) {
      try {
        const wasProcessed = await this._processSingleMessage(
          message,
          internalPhoneId,
          contactsMap,
          wabaId,
        );
        if (wasProcessed) count++;
      } catch (msgErr) {
        logError(msgErr, {
          action: 'process_single_message',
          messageId: message.id,
        });
      }
    }

    return count;
  },

  async _processSingleMessage(
    message: WebhookMessage,
    internalPhoneId: string,
    contactsMap: Record<string, string>,
    wabaId: string,
  ): Promise<boolean> {
    if (message.type !== 'text') {
      logger.info('Skipping non-text message', {
        type: message.type,
        messageId: message.id,
      });
      return false;
    }

    const customerPhone = message.from;
    const customerName = contactsMap[customerPhone];
    const content = message.text?.body;
    const timestamp = new Date(parseInt(message.timestamp) * 1000);

    const savedPayload = await ChatRepository.processIncomingMessage({
      phoneNumberId: internalPhoneId,
      customerPhone,
      customerName,
      message: {
        messageId: message.id,
        type: 'text',
        content,
        timestamp,
        metadata: JSON.stringify(message),
      },
    });

    publishChatEvent({
      type: 'message',
      wabaId,
      conversation: toChatConversation(savedPayload.conversation),
      message: toChatMessage(savedPayload.message),
    });

    logger.info('Saved incoming message to DB successfully', {
      messageId: message.id,
      customerPhone,
    });

    return true;
  },

  async _processStatusesList(
    statuses: WebhookStatus[] = [],
    fallbackWabaId: string,
  ): Promise<number> {
    let count = 0;

    for (const status of statuses) {
      try {
        const wasProcessed = await this._processSingleStatus(
          status,
          fallbackWabaId,
        );
        if (wasProcessed) count++;
      } catch (statusErr) {
        logError(statusErr, {
          action: 'process_single_status',
          messageId: status.id,
        });
      }
    }

    return count;
  },

  async _processSingleStatus(
    status: WebhookStatus,
    fallbackWabaId: string,
  ): Promise<boolean> {
    const normalizedStatus = this._normalizeMessageStatus(status.status);

    if (!normalizedStatus) {
      logger.info('Skipping unsupported message status', {
        status: status.status,
        messageId: status.id,
      });
      return false;
    }

    const updatedMessage = await ChatRepository.updateMessageStatusByMessageId({
      messageId: status.id,
      status: normalizedStatus,
      errorMessage:
        status.errors?.[0]?.message ?? status.errors?.[0]?.title ?? undefined,
    });

    if (!updatedMessage) {
      logger.warn('Received status update for unknown message id', {
        messageId: status.id,
        status: normalizedStatus,
      });
      return false;
    }

    publishChatEvent({
      type: 'status',
      wabaId: updatedMessage.conversation.phoneNumber.wabaId ?? fallbackWabaId,
      conversationId: updatedMessage.conversationId,
      message: toChatMessage(updatedMessage),
    });

    return true;
  },

  _normalizeMessageStatus(status: string): ChatMessageStatus | null {
    if (status === 'sent' || status === 'delivered' || status === 'read') {
      return status;
    }

    if (status === 'failed') {
      return 'failed';
    }

    return null;
  },
};
