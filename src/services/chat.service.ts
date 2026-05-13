import eventBus, { SSE_EVENTS, getUserEvent } from '@/lib/event-bus';
import { logError, logger } from '@/lib/logger';
import { ChatRepository } from '@/repositories/chat.repository';
import {
  Contact,
  MetaWebhookPayload,
  MetaWebhookPayloadSchema,
  WebhookEntry,
  WebhookMessage,
  WebhookValue,
} from '@/schemas/webhook.schema';

export const ChatService = {
  async getAllChats(params: { wabaId: string; userId: string }) {
    const { wabaId, userId } = params;
    logger.info('Fetching all chats for WABA without pagination', {
      wabaId,
      userId,
    });

    const { chats } = await ChatRepository.findAllByWabaId({ wabaId, userId });
    logger.info('All chat list fetched successfully', {
      wabaId,
      userId,
      count: chats.length,
    });
    return { chats, total: chats.length };
  },

  async markAsRead(params: { convId: string; wabaId: string; userId: string }) {
    const { convId, wabaId, userId } = params;
    logger.info('Marking conversation as read', { convId, wabaId, userId });

    const result = await ChatRepository.markConversationAsRead({
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

  async processMetaWebhookPayload(payload: unknown) {
    logger.info('Processing Meta Webhook payload in ChatService');

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
      await ChatRepository.findPhoneNumberByMetaId(metaPhoneNumberId);

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
    } = await ChatRepository.processIncomingMessage({
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

    return true;
  },
};
