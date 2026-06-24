import { ApiError } from '@/lib/api-helper/error';
import eventBus, { SSE_EVENTS, getUserEvent } from '@/lib/chat/event-bus';
import { handleDebounceIncomingMessage } from '@/lib/server/debounce-message-manager';
import { decrypt } from '@/lib/server/encryption';
import { logError, logger } from '@/lib/server/logger';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { MessageRepository } from '@/repositories/message.repository';
import {
  Contact,
  MetaWebhookPayload,
  MetaWebhookPayloadSchema,
  WebhookEntry,
  WebhookMessage,
  WebhookValue,
} from '@/schemas/webhook.schema';

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

  async processMetaWebhookPayload(payload: unknown) {
    logger.info('Processing Meta Webhook payload in ConversationService');

    const parsedBody = this._validatePayload(payload);
    if (!parsedBody) {
      return { processed: false, reason: 'Invalid or ignored payload' };
    }

    const processedCount = await this._processEntries(parsedBody.entry || []);

    return { processed: true, count: processedCount };
  },

  // --- Private Helper Methods ---

  _validatePayload(payload: unknown): MetaWebhookPayload | null {
    const parsed = MetaWebhookPayloadSchema.safeParse(payload);

    if (!parsed.success) {
      logger.warn('Invalid Meta Webhook payload structure', {
        errors: parsed.error.format(),
      });
      throw new Error('Invalid Webhook Payload');
    }

    const body = parsed.data;

    // Ensure it's a WhatsApp event
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
      await ConversationRepository.findPhoneNumberByMetaId(metaPhoneNumberId);

    if (!internalPhoneResult) {
      logger.warn('Received message for unknown Meta Phone Number ID', {
        metaPhoneNumberId,
      });
      return 0;
    }

    const contactsMap = this._mapContacts(value.contacts);
    return this._processMessagesList({
      messages: value.messages,
      internalPhoneId: internalPhoneResult.id,
      contactsMap,
    });
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

  async _processMessagesList(params: {
    messages?: WebhookMessage[];
    internalPhoneId: string;
    contactsMap: Record<string, string>;
  }): Promise<number> {
    const { messages = [], internalPhoneId, contactsMap } = params;
    let count = 0;

    for (const message of messages) {
      try {
        const wasProcessed = await this._processSingleMessage({
          message,
          internalPhoneId,
          contactsMap,
        });
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

  async _processSingleMessage(params: {
    message: WebhookMessage;
    internalPhoneId: string;
    contactsMap: Record<string, string>;
  }): Promise<boolean> {
    const { message, internalPhoneId, contactsMap } = params;
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

    const {
      message: savedMessage,
      conversation,
      userId,
      wabaId,
    } = await ConversationRepository.processIncomingMessage({
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

    logger.info('Saved incoming message to DB successfully', {
      messageId: message.id,
      customerPhone,
    });

    if (!userId) {
      logError(
        new Error('Could not determine userId for real-time notification'),
        {
          action: 'Could not determine userId for real-time notification',
          phoneNumberId: internalPhoneId,
        },
      );
      return true;
    }

    // Emit real-time event via SSE to the specific user channel
    eventBus.emit(getUserEvent(SSE_EVENTS.NEW_MESSAGE, userId), {
      ...savedMessage,
      conversation,
      userId,
      wabaId,
    });

    if (conversation.adminTakeover) {
      logger.info('Skipping debounce queue for admin takeover conversation', {
        conversationId: conversation.id,
      });
      return true;
    }

    handleDebounceIncomingMessage(conversation.id);

    return true;
  },
};
