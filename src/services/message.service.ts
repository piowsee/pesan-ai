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

export type ContactFields = {
  customerPhone: string | null;
  customerName: string | null;
  customerUsername: string | null;
};

export type ConversationContact = Partial<ContactFields> | null | undefined;

export function flattenContactObject<
  T extends { contact?: ConversationContact },
>(conversation: T) {
  const { contact, ...conversationWithoutContact } = conversation;

  return {
    ...conversationWithoutContact,
    customerPhone: contact?.customerPhone ?? null,
    customerName: contact?.customerName ?? null,
    customerUsername: contact?.customerUsername ?? null,
  };
}

function normalizeMessageMediaSize<
  T extends { mediaSize?: bigint | number | null },
>(message: T) {
  return {
    ...message,
    mediaSize: message.mediaSize == null ? null : Number(message.mediaSize),
  };
}

/*
 * helper to flatten contact object and filter out system user token
 */
function flattenContactForEvent<
  T extends {
    contact?: ConversationContact;
    phoneNumber?: {
      waba?: { systemUserToken?: string | null } | null;
      [key: string]: unknown;
    } | null;
  },
>(conversation: T) {
  const safeConversation = flattenContactObject(conversation);
  const waba = safeConversation.phoneNumber?.waba;

  if (!waba || !('systemUserToken' in waba)) {
    return safeConversation;
  }

  // remove system user token from payload
  const { systemUserToken, ...safeWaba } = waba;
  void systemUserToken;

  return {
    ...safeConversation,
    phoneNumber: safeConversation.phoneNumber
      ? {
          ...safeConversation.phoneNumber,
          waba: safeWaba,
        }
      : safeConversation.phoneNumber,
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

type WebhookContactDetails = {
  bsuid?: string;
  customerPhone?: string;
  customerName?: string;
  customerUsername?: string;
};

type WebhookContactLookup = {
  byPhone: Map<string, WebhookContactDetails>;
  byBsuid: Map<string, WebhookContactDetails>;
};

// Route-facing wabaId values here are internal DB WhatsappBusinessAccount.id.
// Meta API calls use phoneNumber.phoneNumberId, which is the Meta Phone Number ID.
export const MessageService = {
  async getMessagesPaginated(params: {
    convId: string;
    wabaId: string; // Internal DB WhatsappBusinessAccount.id.
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
      messages: result.messages.map(normalizeMessageMediaSize),
    };
  },

  async sendAdminTextMessage(params: {
    convId: string;
    wabaId: string; // Internal DB WhatsappBusinessAccount.id.
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

    const { phoneNumber, contact } = conversationMeta;
    const phoneNumberId = phoneNumber.phoneNumberId; // admin's  Meta Phone Number Id
    const recipient = contact?.bsuid ?? contact?.customerPhone ?? null;

    if (!recipient) {
      throw new ApiError(
        'Cannot send message because the customer has no WhatsApp phone or BSUID',
        400,
      );
    }

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
      to: recipient,
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

    const safeConversation = flattenContactForEvent(conversationMeta);

    // Emit real-time event via SSE to the specific user channel
    eventBus.emit(getUserEvent(SSE_EVENTS.NEW_MESSAGE, userId), {
      ...savedMessage,
      conversation: safeConversation,
      userId,
      wabaId: conversationMeta.phoneNumber.wabaId,
    });

    return { message: savedMessage, conversation: safeConversation };
  },

  async confirmUploadedMediaMessage(params: {
    convId: string;
    wabaId: string; // Internal DB WhatsappBusinessAccount.id.
    userId: string;
    key: string;
    caption?: string;
    filename?: string;
  }) {
    const { convId, wabaId, userId, key, caption, filename } = params;
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

    const { phoneNumber, contact } = conversationMeta;
    const phoneNumberId = phoneNumber.phoneNumberId; // admin's  Meta Phone Number Id
    const recipient = contact?.bsuid ?? contact?.customerPhone ?? null;

    if (!recipient) {
      throw new ApiError(
        'Cannot send message because the customer has no WhatsApp phone or BSUID',
        400,
      );
    }

    const tokenToUse = decrypt(phoneNumber.waba?.systemUserToken || '');

    if (!tokenToUse) {
      throw new ApiError('WhatsApp token is missing or invalid', 403);
    }

    const waResult = await MetaFetchService.sendMessage({
      phoneNumberId,
      token: tokenToUse,
      to: recipient,
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
      mediaFilename: filename ?? null,
      mediaSize: uploadedMedia.mediaSize,
    });
    const message = normalizeMessageMediaSize(savedMessage);

    const safeConversation = flattenContactForEvent(conversationMeta);

    eventBus.emit(getUserEvent(SSE_EVENTS.NEW_MESSAGE, userId), {
      ...message,
      conversation: safeConversation,
      userId,
      wabaId: conversationMeta.phoneNumber.wabaId,
    });

    logger.info('Uploaded media message saved successfully', {
      convId,
      wabaId,
      userId,
      key: uploadedMedia.key,
    });

    return { message, conversation: safeConversation };
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

  _mapContacts(contacts: Contact[] = []): WebhookContactLookup {
    // lookup either by phone number or by BSUID
    const lookup: WebhookContactLookup = {
      byPhone: new Map(),
      byBsuid: new Map(),
    };

    for (const contact of contacts) {
      const details: WebhookContactDetails = {
        bsuid: contact.user_id,
        customerPhone: contact.wa_id,
        customerName: contact.profile?.name,
        customerUsername: contact.profile?.username,
      };

      if (
        !details.bsuid &&
        !details.customerPhone &&
        !details.customerUsername
      ) {
        continue;
      }

      if (details.customerPhone) {
        lookup.byPhone.set(details.customerPhone, details);
      }

      if (details.bsuid) {
        lookup.byBsuid.set(details.bsuid, details);
      }
    }

    return lookup;
  },

  _getIncomingContactDetails(
    message: WebhookMessage,
    contactsLookup: WebhookContactLookup,
  ): WebhookContactDetails {
    const byBsuid = message.from_user_id
      ? contactsLookup.byBsuid.get(message.from_user_id)
      : undefined;
    const byPhone = message.from
      ? contactsLookup.byPhone.get(message.from)
      : undefined;
    const contact = byBsuid ?? byPhone;

    return {
      bsuid: contact?.bsuid ?? message.from_user_id,
      customerPhone: contact?.customerPhone ?? message.from,
      customerName: contact?.customerName,
      customerUsername: contact?.customerUsername,
    };
  },

  _getEchoContactDetails(
    messageEcho: WebhookMessageEcho,
  ): WebhookContactDetails {
    return {
      customerPhone: messageEcho.to,
    };
  },

  // --- Incoming customer message processing ---

  async _processIncomingMessageChange(value: WebhookValue): Promise<number> {
    const metaPhoneNumberId = value.metadata?.phone_number_id; // Meta Phone Number ID.
    if (!metaPhoneNumberId) return 0;

    const internalPhoneResult =
      await ConversationRepository.findPhoneNumberByMetaId(metaPhoneNumberId);

    if (!internalPhoneResult) {
      logger.warn('Received message for unknown Meta Phone Number ID', {
        metaPhoneNumberId,
      });
      return 0;
    }

    const contactsLookup = this._mapContacts(value.contacts);
    return this._processMessagesList({
      messages: value.messages,
      internalPhoneId: internalPhoneResult.id,
      contactsLookup,
    });
  },

  async _processMessagesList(params: {
    messages?: WebhookMessage[];
    internalPhoneId: string; // Internal DB PhoneNumber.id.
    contactsLookup: WebhookContactLookup;
  }): Promise<number> {
    const { messages = [], internalPhoneId, contactsLookup } = params;
    let count = 0;

    for (const message of messages) {
      try {
        const wasProcessed = await this._processSingleMessage({
          message,
          internalPhoneId,
          contactsLookup,
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
    internalPhoneId: string; // Internal DB PhoneNumber.id.
    contactsLookup: WebhookContactLookup;
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
    internalPhoneId: string; // Internal DB PhoneNumber.id.
    contactsLookup: WebhookContactLookup;
  }): Promise<boolean> {
    const { message: webhookMessage, internalPhoneId, contactsLookup } = params;
    const contactDetails = this._getIncomingContactDetails(
      webhookMessage,
      contactsLookup,
    );
    const content = webhookMessage.text?.body;
    const timestamp = new Date(parseInt(webhookMessage.timestamp) * 1000);

    const {
      message: savedMessage,
      conversation,
      userId,
      wabaId,
    } = await ConversationRepository.processIncomingMessage({
      phoneNumberId: internalPhoneId,
      ...contactDetails,
      message: {
        messageId: webhookMessage.id,
        type: 'text',
        content,
        timestamp,
        metadata: JSON.stringify(webhookMessage),
      },
    });

    logger.info('Saved incoming text message to DB successfully', {
      messageId: webhookMessage.id,
      customerPhone: contactDetails.customerPhone,
      customerUsername: contactDetails.customerUsername,
    });

    const message = normalizeMessageMediaSize(savedMessage);
    const safeConversation = flattenContactForEvent(conversation);

    eventBus.emit(getUserEvent(SSE_EVENTS.NEW_MESSAGE, userId), {
      ...message,
      conversation: safeConversation,
      userId,
      wabaId,
    });

    if (conversation.adminTakeover) {
      logger.info('Skipping debounce queue for admin takeover conversation', {
        conversationId: conversation.id,
      });
      return true;
    }

    handleDebounceIncomingMessage({
      conversationId: conversation.id,
      userId,
      wabaId,
    });

    return true;
  },

  async _processIncomingMediaMessage(params: {
    message: WebhookMessage;
    internalPhoneId: string; // Internal DB PhoneNumber.id.
    contactsLookup: WebhookContactLookup;
    mediaType: UploadMediaType;
  }): Promise<boolean> {
    const {
      message: webhookMessage,
      internalPhoneId,
      contactsLookup,
      mediaType,
    } = params;
    const mediaPayload = webhookMessage[mediaType];

    if (!mediaPayload?.url) {
      logger.warn('WhatsApp sent type media with no media URL');
      throw new ApiError('WhatsApp media URL is missing', 400);
    }
    const contactDetails = this._getIncomingContactDetails(
      webhookMessage,
      contactsLookup,
    );

    // we need to atleast convId and wabaId to create S3 Object Key
    const preparedConversation =
      await ConversationRepository.prepareWebhookMessageConversation({
        phoneNumberId: internalPhoneId,
        ...contactDetails,
      });

    // system user token is needed to read WhatsApp's Media URL
    const tokenToUse = decrypt(preparedConversation.systemUserToken || '');

    if (!tokenToUse) {
      throw new ApiError('WhatsApp token is missing or invalid', 403);
    }

    const uploadedMedia = await S3Service.streamWhatsAppMediaToObjectStorage({
      whatsappUrl: mediaPayload.url,
      token: tokenToUse,
      userId: preparedConversation.userId,
      wabaId: preparedConversation.wabaId,
      convId: preparedConversation.conversation.id,
      contentType: mediaPayload.mime_type,
    });
    const {
      message: savedMessage,
      conversation,
      userId,
      wabaId,
    } = await ConversationRepository.processIncomingMessage({
      phoneNumberId: internalPhoneId,
      ...contactDetails,
      message: {
        messageId: webhookMessage.id,
        type: mediaType,
        content: mediaPayload.caption,
        timestamp: new Date(parseInt(webhookMessage.timestamp) * 1000),
        metadata: JSON.stringify(webhookMessage),
        mediaObjectKey: uploadedMedia.key,
        mediaMimeType: uploadedMedia.mediaMimeType,
        mediaFilename:
          'filename' in mediaPayload &&
          typeof mediaPayload.filename === 'string'
            ? mediaPayload.filename
            : null,
        mediaSize: uploadedMedia.mediaSize,
      },
    });

    logger.info('Saved incoming media message to DB successfully', {
      messageId: webhookMessage.id,
      customerPhone: contactDetails.customerPhone,
      customerUsername: contactDetails.customerUsername,
      mediaType,
      key: uploadedMedia.key,
    });

    const message = normalizeMessageMediaSize(savedMessage);
    const safeConversation = flattenContactForEvent(conversation);

    eventBus.emit(getUserEvent(SSE_EVENTS.NEW_MESSAGE, userId), {
      ...message,
      conversation: safeConversation,
      userId,
      wabaId,
    });

    if (conversation.adminTakeover) {
      logger.info('Skipping debounce queue for admin takeover conversation', {
        conversationId: conversation.id,
      });
      return true;
    }

    // debounce still called because we might update our agent to support media
    handleDebounceIncomingMessage({
      conversationId: conversation.id,
      userId,
      wabaId,
    });

    return true;
  },

  // --- WhatsApp Business App message echo processing ---

  async _processMessageEchoChange(
    value: WebhookMessageEchoValue,
  ): Promise<number> {
    const metaPhoneNumberId = value.metadata?.phone_number_id; // Meta Phone Number ID.
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
    });
  },

  async _processMessageEchoesList(params: {
    messageEchoes?: WebhookMessageEcho[];
    internalPhoneId: string; // Internal DB PhoneNumber.id.
  }): Promise<number> {
    const { messageEchoes = [], internalPhoneId } = params;
    let count = 0;

    for (const messageEcho of messageEchoes) {
      try {
        const wasProcessed = await this._processSingleMessageEcho({
          messageEcho,
          internalPhoneId,
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
    internalPhoneId: string; // Internal DB PhoneNumber.id.
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
    internalPhoneId: string; // Internal DB PhoneNumber.id.
  }): Promise<boolean> {
    const { messageEcho, internalPhoneId } = params;
    // we get customer contact from message.to
    // because smb_message_echoes doesn't have contact field
    const contactDetails = this._getEchoContactDetails(messageEcho);
    const {
      message: savedMessage,
      conversation,
      userId,
      wabaId,
    } = await ConversationRepository.processOutgoingMessageEcho({
      phoneNumberId: internalPhoneId,
      ...contactDetails,
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
      customerPhone: contactDetails.customerPhone,
    });

    const message = normalizeMessageMediaSize(savedMessage);
    const safeConversation = flattenContactForEvent(conversation);

    eventBus.emit(getUserEvent(SSE_EVENTS.NEW_MESSAGE, userId), {
      ...message,
      conversation: safeConversation,
      userId,
      wabaId,
    });

    return true;
  },

  async _processMessageEchoMediaMessage(params: {
    messageEcho: WebhookMessageEcho;
    internalPhoneId: string; // Internal DB PhoneNumber.id.
    mediaType: UploadMediaType;
  }): Promise<boolean> {
    const { messageEcho, internalPhoneId, mediaType } = params;
    const mediaPayload = messageEcho[mediaType];

    if (!mediaPayload?.url) {
      logger.warn('WhatsApp sent type media with no media URL');
      throw new ApiError('WhatsApp media URL is missing', 400);
    }
    const contactDetails = this._getEchoContactDetails(messageEcho);

    // we need to atleast convId and wabaId to create S3 Object Key
    const preparedConversation =
      await ConversationRepository.prepareWebhookMessageConversation({
        phoneNumberId: internalPhoneId,
        ...contactDetails,
      });

    // system user token is needed to read WhatsApp's Media URL
    const tokenToUse = decrypt(preparedConversation.systemUserToken || '');

    if (!tokenToUse) {
      throw new ApiError('WhatsApp token is missing or invalid', 403);
    }

    const uploadedMedia = await S3Service.streamWhatsAppMediaToObjectStorage({
      whatsappUrl: mediaPayload.url,
      token: tokenToUse,
      userId: preparedConversation.userId,
      wabaId: preparedConversation.wabaId,
      convId: preparedConversation.conversation.id,
      contentType: mediaPayload.mime_type,
    });
    const {
      message: savedMessage,
      conversation,
      userId,
      wabaId,
    } = await ConversationRepository.processOutgoingMessageEcho({
      phoneNumberId: internalPhoneId,
      ...contactDetails,
      message: {
        messageId: messageEcho.id,
        type: mediaType,
        content: mediaPayload.caption,
        timestamp: new Date(parseInt(messageEcho.timestamp) * 1000),
        metadata: JSON.stringify(messageEcho),
        mediaObjectKey: uploadedMedia.key,
        mediaMimeType: uploadedMedia.mediaMimeType,
        mediaFilename:
          'filename' in mediaPayload &&
          typeof mediaPayload.filename === 'string'
            ? mediaPayload.filename
            : null,
        mediaSize: uploadedMedia.mediaSize,
      },
    });

    logger.info('Saved media message echo to DB successfully', {
      messageId: messageEcho.id,
      customerPhone: contactDetails.customerPhone,
      mediaType,
      key: uploadedMedia.key,
    });

    const message = normalizeMessageMediaSize(savedMessage);
    const safeConversation = flattenContactForEvent(conversation);

    eventBus.emit(getUserEvent(SSE_EVENTS.NEW_MESSAGE, userId), {
      ...message,
      conversation: safeConversation,
      userId,
      wabaId,
    });

    return true;
  },
};
