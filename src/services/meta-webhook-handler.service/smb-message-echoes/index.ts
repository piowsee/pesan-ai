import { ApiError } from '@/lib/api-helper/error';
import { decrypt } from '@/lib/server/encryption';
import { logError, logger } from '@/lib/server/logger';
import { ConversationRepository } from '@/repositories/conversation.repository';
import type {
  WebhookMessageEcho,
  WebhookMessageEchoValue,
} from '@/schemas/meta-webhook-handler.schema/smb-message-echoes';
import type { UploadMediaType } from '@/schemas/s3-upload.schema';
import { S3Service } from '@/services/s3.service';

import { type WebhookContactDetails, emitNewMessageEvent } from '../shared';

export const SmbMessageEchoesWebhookHandler = {
  async processChange(value: WebhookMessageEchoValue): Promise<number> {
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

    return processMessageEchoesList({
      messageEchoes: value.message_echoes,
      internalPhoneId: internalPhoneResult.id,
    });
  },
};

function getEchoContactDetails(
  messageEcho: WebhookMessageEcho,
): WebhookContactDetails {
  return {
    customerPhone: messageEcho.to,
  };
}

async function processMessageEchoesList(params: {
  messageEchoes?: WebhookMessageEcho[];
  internalPhoneId: string; // Internal DB PhoneNumber.id.
}): Promise<number> {
  const { messageEchoes = [], internalPhoneId } = params;
  let count = 0;

  for (const messageEcho of messageEchoes) {
    try {
      const wasProcessed = await processSingleMessageEcho({
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
}

async function processSingleMessageEcho(params: {
  messageEcho: WebhookMessageEcho;
  internalPhoneId: string; // Internal DB PhoneNumber.id.
}): Promise<boolean> {
  const { messageEcho } = params;

  if (messageEcho.type === 'text') {
    return processMessageEchoTextMessage(params);
  } else if (messageEcho.type === 'image') {
    return processMessageEchoMediaMessage({ ...params, mediaType: 'image' });
  } else if (messageEcho.type === 'audio') {
    return processMessageEchoMediaMessage({ ...params, mediaType: 'audio' });
  } else if (messageEcho.type === 'video') {
    return processMessageEchoMediaMessage({ ...params, mediaType: 'video' });
  } else if (messageEcho.type === 'document') {
    return processMessageEchoMediaMessage({ ...params, mediaType: 'document' });
  }

  logger.info('Skipping unsupported message echo type', {
    type: messageEcho.type,
    messageId: messageEcho.id,
  });
  return false;
}

async function processMessageEchoTextMessage(params: {
  messageEcho: WebhookMessageEcho;
  internalPhoneId: string; // Internal DB PhoneNumber.id.
}): Promise<boolean> {
  const { messageEcho, internalPhoneId } = params;
  const contactDetails = getEchoContactDetails(messageEcho);
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

  emitNewMessageEvent({ savedMessage, conversation, userId, wabaId });

  return true;
}

async function processMessageEchoMediaMessage(params: {
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
  const contactDetails = getEchoContactDetails(messageEcho);

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
        'filename' in mediaPayload && typeof mediaPayload.filename === 'string'
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

  emitNewMessageEvent({ savedMessage, conversation, userId, wabaId });

  return true;
}
