import { ApiError } from '@/lib/api-helper/error';
import eventBus, { SSE_EVENTS, getUserEvent } from '@/lib/chat/event-bus';
import { handleDebounceIncomingMessage } from '@/lib/server/debounce-message-manager';
import { decrypt } from '@/lib/server/encryption';
import { logError, logger } from '@/lib/server/logger';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { MessageRepository } from '@/repositories/message.repository';
import type { UploadMediaType } from '@/schemas/s3-upload.schema';
import {
  Contact,
  MetaWebhookPayload,
  MetaWebhookPayloadSchema,
  WebhookEntry,
  WebhookMessage,
  WebhookMessageEcho,
  WebhookMessageEchoValue,
  WebhookValue,
} from '@/schemas/webhook.schema';

import {
  MetaFetchService,
  type MetaOutboundMessage,
} from './meta-fetch.service';
import { S3Service } from './s3.service';

function serializeMessageForTransport<
  T extends { mediaSize?: bigint | number | null },
>(message: T) {
  return {
    ...message,
    mediaSize: message.mediaSize == null ? null : Number(message.mediaSize),
  };
}

function buildOutboundMediaMessage(params: {
  mediaType: UploadMediaType;
  link: string;
  caption?: string | null;
}): MetaOutboundMessage {
  const { mediaType, link, caption } = params;

  switch (mediaType) {
    case 'audio':
      return { type: 'audio', link };
    case 'document':
      return { type: 'document', link, caption };
    case 'image':
      return { type: 'image', link, caption };
    case 'video':
      return { type: 'video', link, caption };
  }
}

type WebhookMediaMessageType = UploadMediaType;

function getWebhookMessageMediaPayload(
  message: WebhookMessage,
  mediaType: WebhookMediaMessageType,
) {
  return message[mediaType];
}

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

    return {
      ...result,
      messages: result.messages.map(serializeMessageForTransport),
    };
  },

  async sendAdminTextMessage(params: {
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
    const waResult = await MetaFetchService.sendMessage({
      phoneNumberId,
      token: tokenToUse,
      to: customerPhone,
      message: { type: 'text', text: content },
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

  async confirmUploadedMediaMessage(params: {
    convId: string;
    wabaId: string;
    userId: string;
    key: string;
    caption?: string;
  }) {
    const { convId, wabaId, userId, key, caption } = params;
    logger.info('Confirming uploaded media message', {
      convId,
      wabaId,
      userId,
    });

    const conversationMeta =
      await ConversationRepository.getConversationMetaForSending({
        convId,
        wabaId,
        userId,
      });

    if (!conversationMeta) {
      throw new ApiError('Conversation not found or access denied', 404);
    }

    const uploadedMedia = await S3Service.verifyUploadedMedia({
      userId,
      wabaId,
      convId,
      key,
    });
    const { downloadUrl } = await S3Service.createPresignedDownloadUrl({
      userId,
      wabaId,
      convId,
      key: uploadedMedia.key,
    });
    const { phoneNumber, customerPhone } = conversationMeta;
    const tokenToUse = decrypt(phoneNumber.waba?.systemUserToken || '');

    if (!tokenToUse) {
      throw new ApiError('WhatsApp token is missing or invalid', 403);
    }

    const waResult = await MetaFetchService.sendMessage({
      phoneNumberId: phoneNumber.phoneNumberId,
      token: tokenToUse,
      to: customerPhone,
      message: buildOutboundMediaMessage({
        mediaType: uploadedMedia.mediaType,
        link: downloadUrl,
        caption,
      }),
    });
    const savedMessage = await MessageRepository.saveMessage({
      conversationId: convId,
      direction: 'outgoing',
      source: 'admin',
      type: uploadedMedia.mediaType,
      content: caption,
      status: waResult.status,
      messageId: waResult.messageId,
      timestamp: new Date(),
      mediaObjectKey: uploadedMedia.key,
      mediaMimeType: uploadedMedia.mediaMimeType,
      mediaSize: uploadedMedia.mediaSize,
    });
    const message = serializeMessageForTransport(savedMessage);

    eventBus.emit(getUserEvent(SSE_EVENTS.NEW_MESSAGE, userId), {
      ...message,
      conversation: conversationMeta,
      userId,
      wabaId: conversationMeta.phoneNumber.wabaId,
    });

    logger.info('Uploaded media message saved successfully', {
      convId,
      wabaId,
      userId,
      key: uploadedMedia.key,
    });

    return { message, conversation: conversationMeta };
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
        let changeProcessedCount = 0;

        if (change.field === 'messages') {
          changeProcessedCount = await this._processIncomingMessageChange(
            change.value,
          );
        } else if (change.field === 'smb_message_echoes') {
          changeProcessedCount = await this._processMessageEchoChange(
            change.value,
          );
        }

        processedCount += changeProcessedCount;
      }
    }

    return processedCount;
  },

  // --- Shared webhook helpers ---

  _mapContacts(contacts: Contact[] = []): Record<string, string> {
    const contactsMap: Record<string, string> = {};
    for (const contact of contacts) {
      if (contact.wa_id && contact.profile?.name) {
        contactsMap[contact.wa_id] = contact.profile.name;
      }
    }
    return contactsMap;
  },

  // --- Incoming customer message processing ---

  async _processIncomingMessageChange(value: WebhookValue): Promise<number> {
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
    const { message } = params;

    if (message.type === 'text') {
      return this._processIncomingTextMessage(params);
    } else if (message.type === 'image') {
      return this._processIncomingMediaMessage({
        ...params,
        mediaType: 'image',
      });
    } else if (message.type === 'audio') {
      return this._processIncomingMediaMessage({
        ...params,
        mediaType: 'audio',
      });
    } else if (message.type === 'video') {
      return this._processIncomingMediaMessage({
        ...params,
        mediaType: 'video',
      });
    } else if (message.type === 'document') {
      return this._processIncomingMediaMessage({
        ...params,
        mediaType: 'document',
      });
    }

    logger.info('Skipping unsupported incoming message type', {
      type: message.type,
      messageId: message.id,
    });
    return false;
  },

  async _processIncomingTextMessage(params: {
    message: WebhookMessage;
    internalPhoneId: string;
    contactsMap: Record<string, string>;
  }): Promise<boolean> {
    const { message, internalPhoneId, contactsMap } = params;
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

    logger.info('Saved incoming text message to DB successfully', {
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

  async _processIncomingMediaMessage(params: {
    message: WebhookMessage;
    mediaType: WebhookMediaMessageType;
  }): Promise<boolean> {
    const { message, mediaType } = params;
    const mediaPayload = getWebhookMessageMediaPayload(message, mediaType);

    logger.info('Received incoming media message; persistence is pending', {
      messageId: message.id,
      mediaType,
      mediaPayload,
    });

    // TODO: Download the media asset from Meta using the media payload id/url,
    // upload it to object storage, then save the incoming message with
    // mediaObjectKey, mediaMimeType, mediaSize, caption/content, and metadata.
    return false;
  },

  // --- WhatsApp Business App message echo processing ---

  async _processMessageEchoChange(
    value: WebhookMessageEchoValue,
  ): Promise<number> {
    const metaPhoneNumberId = value.metadata?.phone_number_id;
    if (!metaPhoneNumberId) return 0;

    const internalPhoneResult =
      await ConversationRepository.findPhoneNumberByMetaId(metaPhoneNumberId);

    if (!internalPhoneResult) {
      logger.warn('Received message echo for unknown Meta Phone Number ID', {
        metaPhoneNumberId,
      });
      return 0;
    }

    return this._processMessageEchoesList({
      messageEchoes: value.message_echoes,
      internalPhoneId: internalPhoneResult.id,
      contactsMap: this._mapContacts(value.contacts),
    });
  },

  async _processMessageEchoesList(params: {
    messageEchoes?: WebhookMessageEcho[];
    internalPhoneId: string;
    contactsMap: Record<string, string>;
  }): Promise<number> {
    const { messageEchoes = [], internalPhoneId, contactsMap } = params;
    let count = 0;

    for (const messageEcho of messageEchoes) {
      try {
        const wasProcessed = await this._processSingleMessageEcho({
          messageEcho,
          internalPhoneId,
          contactsMap,
        });
        if (wasProcessed) count++;
      } catch (error) {
        logError(error, {
          action: 'process_single_message_echo',
          messageId: messageEcho.id,
        });
      }
    }

    return count;
  },

  async _processSingleMessageEcho(params: {
    messageEcho: WebhookMessageEcho;
    internalPhoneId: string;
    contactsMap: Record<string, string>;
  }): Promise<boolean> {
    const { messageEcho } = params;

    if (messageEcho.type === 'text') {
      return this._processMessageEchoTextMessage(params);
    } else if (messageEcho.type === 'image') {
      return this._processMessageEchoMediaMessage({
        ...params,
        mediaType: 'image',
      });
    } else if (messageEcho.type === 'audio') {
      return this._processMessageEchoMediaMessage({
        ...params,
        mediaType: 'audio',
      });
    } else if (messageEcho.type === 'video') {
      return this._processMessageEchoMediaMessage({
        ...params,
        mediaType: 'video',
      });
    } else if (messageEcho.type === 'document') {
      return this._processMessageEchoMediaMessage({
        ...params,
        mediaType: 'document',
      });
    }

    logger.info('Skipping unsupported message echo type', {
      type: messageEcho.type,
      messageId: messageEcho.id,
    });
    return false;
  },

  async _processMessageEchoTextMessage(params: {
    messageEcho: WebhookMessageEcho;
    internalPhoneId: string;
    contactsMap: Record<string, string>;
  }): Promise<boolean> {
    const { messageEcho, internalPhoneId, contactsMap } = params;
    const customerPhone = messageEcho.to;
    const {
      message: savedMessage,
      conversation,
      userId,
      wabaId,
    } = await ConversationRepository.processOutgoingMessageEcho({
      phoneNumberId: internalPhoneId,
      customerPhone,
      customerName: contactsMap[customerPhone],
      message: {
        messageId: messageEcho.id,
        type: 'text',
        content: messageEcho.text?.body,
        timestamp: new Date(parseInt(messageEcho.timestamp) * 1000),
        metadata: JSON.stringify(messageEcho),
      },
    });

    logger.info('Saved outgoing WhatsApp Business App message to DB', {
      messageId: messageEcho.id,
      customerPhone,
    });

    if (!userId) {
      logError(
        new Error('Could not determine userId for real-time notification'),
        {
          action: 'Could not determine userId for message echo notification',
          phoneNumberId: internalPhoneId,
        },
      );
      return true;
    }

    eventBus.emit(getUserEvent(SSE_EVENTS.NEW_MESSAGE, userId), {
      ...savedMessage,
      conversation,
      userId,
      wabaId,
    });

    return true;
  },

  async _processMessageEchoMediaMessage(params: {
    messageEcho: WebhookMessageEcho;
    mediaType: WebhookMediaMessageType;
  }): Promise<boolean> {
    const { messageEcho, mediaType } = params;
    const mediaPayload = getWebhookMessageMediaPayload(messageEcho, mediaType);

    logger.info('Received media message echo; persistence is pending', {
      messageId: messageEcho.id,
      mediaType,
      mediaPayload,
    });

    // TODO: Download the media asset from Meta using the media payload id/url,
    // upload it to object storage, then save the echoed WhatsApp Business App
    // message with mediaObjectKey, mediaMimeType, mediaSize, caption/content,
    // metadata, and source='whatsapp_app'.
    return false;
  },
};
