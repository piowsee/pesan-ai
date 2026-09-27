import { withApiAuth } from '@/lib/api-helper/api-handler';
import { jsend } from '@/lib/api-helper/jsend';
import { UpdateContactDetailsSchema } from '@/schemas/contact-details.schema';
import { ContactDetailsService } from '@/services/contact-details.service';

/**
 * @route PATCH /api/waba/:wabaId/conversation/:convId/contact-details
 * @param wabaId {string} - Internal DB WhatsappBusinessAccount.id
 * @param convId {string} - Internal DB Conversation.id
 * @body { label?: string | null, internalNotes?: string | null }
 * @response { status: 'success', data: { id, label, internalNotes } }
 * @access Authenticated users
 * @description Updates the label and/or internal notes for the contact linked to the conversation.
 */
export const PATCH = withApiAuth<{ wabaId: string; convId: string }>(
  async ({ req, user, params: { wabaId, convId } }) => {
    const body = await req.json();
    const { label, internalNotes } = UpdateContactDetailsSchema.parse(body);

    const updated = await ContactDetailsService.updateContactDetails({
      conversationId: convId,
      wabaId,
      userId: user.id,
      label,
      internalNotes,
    });

    return jsend.success(updated);
  },
);
