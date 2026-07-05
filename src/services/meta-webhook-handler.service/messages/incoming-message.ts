import { ApiError } from '@/lib/api-helper/error';
import { handleDebounceIncomingMessage } from '@/lib/server/debounce-message-manager';
import { decrypt } from '@/lib/server/encryption';
import { logError, logger } from '@/lib/server/logger';
import { ConversationRepository } from '@/repositories/conversation.repository';
import type { WebhookMessage } from '@/schemas/meta-webhook-handler.schema';
import type { UploadMediaType } from '@/schemas/s3-upload.schema';
import { S3Service } from '@/services/s3.service';

import {
  type WebhookContactDetails,
  type WebhookContactLookup,
  emitNewMessageEvent,
} from '../shared';

export const IncomingMessageHandler = {
  processMessages,
};

function getIncomingContactDetails(
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
}

async function processMessages(params: {
  messages?: WebhookMessage[];
  internalPhoneId: string; // Internal DB PhoneNumber.id.
  contactsLookup: WebhookContactLookup;
}): Promise<number> {
  const { messages = [], internalPhoneId, contactsLookup } = params;
  let count = 0;

  for (const message of messages) {
    try {
      const wasProcessed = await processSingleMessage({
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
}

async function processSingleMessage(params: {
  message: WebhookMessage;
  internalPhoneId: string; // Internal DB PhoneNumber.id.
  contactsLookup: WebhookContactLookup;
}): Promise<boolean> {
  const { message } = params;

  if (message.type === 'text') {
    return processIncomingTextMessage(params);
  } else if (message.type === 'image') {
    return processIncomingMediaMessage({ ...params, mediaType: 'image' });
  } else if (message.type === 'audio') {
    return processIncomingMediaMessage({ ...params, mediaType: 'audio' });
  } else if (message.type === 'video') {
    return processIncomingMediaMessage({ ...params, mediaType: 'video' });
  } else if (message.type === 'document') {
    return processIncomingMediaMessage({ ...params, mediaType: 'document' });
  }

  logger.info('Skipping unsupported incoming message type', {
    type: message.type,
    messageId: message.id,
  });
  return false;
}

async function processIncomingTextMessage(params: {
  message: WebhookMessage;
  internalPhoneId: string; // Internal DB PhoneNumber.id.
  contactsLookup: WebhookContactLookup;
}): Promise<boolean> {
  const { message: webhookMessage, internalPhoneId, contactsLookup } = params;
  const contactDetails = getIncomingContactDetails(
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

  emitNewMessageEvent({ savedMessage, conversation, userId, wabaId });

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
}

async function processIncomingMediaMessage(params: {
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
  const contactDetails = getIncomingContactDetails(
    webhookMessage,
    contactsLookup,
  );

  const preparedConversation =
    await ConversationRepository.prepareWebhookMessageConversation({
      phoneNumberId: internalPhoneId,
      ...contactDetails,
    });

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
        'filename' in mediaPayload && typeof mediaPayload.filename === 'string'
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

  emitNewMessageEvent({ savedMessage, conversation, userId, wabaId });

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
}
