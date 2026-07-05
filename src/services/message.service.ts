import { ApiError } from '@/lib/api-helper/error';
import eventBus, { SSE_EVENTS, getUserEvent } from '@/lib/chat/event-bus';
import { decrypt } from '@/lib/server/encryption';
import { logError, logger } from '@/lib/server/logger';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { MessageRepository } from '@/repositories/message.repository';
import type { UploadMediaType } from '@/schemas/s3-upload.schema';

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
};
