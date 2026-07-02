/**
 * Admin takeover is an operator/customer-service control, not a Pesan-AI
 * platform-admin feature. When enabled for a conversation, the human operator
 * takes manual control and the AI/webhook response flow is paused for that
 * conversation.
 */
import { withApiAuth } from '@/lib/api-helper/api-handler';
import { jsend } from '@/lib/api-helper/jsend';
import { AdminTakeoverSchema } from '@/schemas/admin-takeover.schema';
import { ConversationService } from '@/services/conversation.service';

/**
 * @route PATCH /api/admin-takeover
 * @body { conversationId: string, wabaId: string, adminTakeover: boolean }
 * @response { status: 'success', data: { conversationId: string, adminTakeover: boolean } }
 * @access Authenticated users
 * @description Enables or disables manual admin takeover for a conversation after validating that the conversation belongs to the authenticated user.
 */
export const PATCH = withApiAuth(async ({ req, user }) => {
  const rawBody = await req.json();
  const validated = AdminTakeoverSchema.safeParse(rawBody);

  if (!validated.success) {
    throw validated.error;
  }

  const result = await ConversationService.updateAdminTakeoverStatus({
    userId: user.id,
    wabaId: validated.data.wabaId,
    conversationId: validated.data.conversationId,
    adminTakeover: validated.data.adminTakeover,
  });

  return jsend.success(result);
});
