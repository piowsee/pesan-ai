import { ApiError } from '@/lib/api-helper/error';
import { logger } from '@/lib/server/logger';
import {
  ContactDetails,
  ContactRepository,
} from '@/repositories/contact.repository';
import { ConversationRepository } from '@/repositories/conversation.repository';

async function verifyConversationOwnership(params: {
  conversationId: string;
  wabaId: string;
  userId: string;
}) {
  const conversation = await ConversationRepository.findConversationById({
    conversationId: params.conversationId,
    userId: params.userId,
    wabaId: params.wabaId,
  });

  if (!conversation) {
    throw new ApiError('Conversation not found or access denied', 404);
  }

  return conversation;
}

export const ContactDetailsService = {
  async updateContactDetails(params: {
    conversationId: string;
    wabaId: string;
    userId: string;
    label?: string | null;
    internalNotes?: string | null;
  }): Promise<ContactDetails> {
    const { conversationId, wabaId, userId, label, internalNotes } = params;

    logger.info('Updating contact details for conversation', {
      conversationId,
      wabaId,
      userId,
    });

    await verifyConversationOwnership({ conversationId, wabaId, userId });

    const contact =
      await ContactRepository.findContactByConversationId(conversationId);

    if (!contact) {
      throw new ApiError('Contact not found for conversation', 404);
    }

    const updated = await ContactRepository.updateContactDetails({
      contactId: contact.id,
      label,
      internalNotes,
    });

    logger.info('Contact details updated successfully', {
      conversationId,
      contactId: contact.id,
    });

    return updated;
  },
};
