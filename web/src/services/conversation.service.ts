import { ApiError } from '@/lib/api-helper/error';
import eventBus, { SSE_EVENTS, getUserEvent } from '@/lib/chat/event-bus';
import { logger } from '@/lib/server/logger';
import { ConversationRepository } from '@/repositories/conversation.repository';

export type ContactFields = {
  customerPhone: string | null;
  customerName: string | null;
  customerUsername: string | null;
  label: string | null;
  internalNotes: string | null;
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
    label: contact?.label ?? null,
    internalNotes: contact?.internalNotes ?? null,
  };
}

function mapConversationMessages<
  T extends {
    contact?: ConversationContact;
    messages?: Array<{ mediaSize?: bigint | number | null }>;
  },
>(conversation: T) {
  const conversationWithContactFields = flattenContactObject(conversation);

  return {
    ...conversationWithContactFields,
    messages: conversationWithContactFields.messages?.map((message) => ({
      ...message,
      mediaSize: message.mediaSize == null ? null : Number(message.mediaSize),
    })),
  };
}

// wabaId in this service is the internal DB WhatsappBusinessAccount.id.
export const ConversationService = {
  async getAllConversations(params: { wabaId: string; userId: string }) {
    const { wabaId, userId } = params;
    logger.info('Fetching all conversations for WABA without pagination', {
      wabaId,
      userId,
    });

    const { conversations } = await ConversationRepository.findAllByWabaId({
      wabaId,
      userId,
    });
    logger.info('Conversation list fetched successfully', {
      wabaId,
      userId,
      count: conversations.length,
    });
    return {
      conversations: conversations.map(mapConversationMessages),
      total: conversations.length,
    };
  },

  async markAsRead(params: { convId: string; wabaId: string; userId: string }) {
    const { convId, wabaId, userId } = params;
    logger.info('Marking conversation as read', { convId, wabaId, userId });

    const result = await ConversationRepository.markConversationAsRead({
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

  async updateAdminTakeoverStatus(params: {
    conversationId: string;
    userId: string;
    wabaId: string;
    adminTakeover: boolean;
  }) {
    const { conversationId, userId, wabaId, adminTakeover } = params;
    logger.info('Updating conversation admin takeover', {
      conversationId,
      userId,
      wabaId,
      adminTakeover,
    });

    const conversation = await ConversationRepository.findConversationById({
      conversationId,
      userId,
      wabaId,
    });

    if (!conversation) {
      throw new ApiError('Conversation not found or access denied', 404);
    }

    const updated = await ConversationRepository.updateAdminTakeoverStatus({
      conversationId,
      adminTakeover,
    });

    logger.info('Conversation admin takeover updated', {
      conversationId,
      userId,
      wabaId,
      adminTakeover: updated.adminTakeover,
    });

    eventBus.emit(getUserEvent(SSE_EVENTS.CONVERSATION_UPDATED, userId), {
      conversationId,
      wabaId,
      adminTakeover,
    });

    return {
      conversationId: updated.id,
      adminTakeover: updated.adminTakeover,
    };
  },
};
