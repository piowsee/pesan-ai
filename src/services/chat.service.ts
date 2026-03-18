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
  WebhookValue,
} from '@/schemas/webhook.schema';

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
        throw new ApiError('WABA not found or access denied', 404);
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
        throw new ApiError('Chat not found or access denied', 404);
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

  // We temporarily use 'any' strictly for internal mapping methods
  // since the Zod inferred types are complex nested arrays
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
    return this._processMessagesList(
      value.messages,
      internalPhoneResult.id,
      contactsMap,
    );
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
  ): Promise<number> {
    let count = 0;

    for (const message of messages) {
      try {
        const wasProcessed = await this._processSingleMessage(
          message,
          internalPhoneId,
          contactsMap,
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

    await ChatRepository.processIncomingMessage({
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

    return true;
  },
};
