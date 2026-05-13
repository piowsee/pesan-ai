import { withApiAuth } from '@/lib/api-handler';
import { jsend } from '@/lib/jsend';
import { ChatService } from '@/services/chat.service';

/**
 * @route PATCH /api/waba/:wabaId/conversation/:convId/read
 * @param wabaId {string}
 * @param convId {string}
 * @response { status: 'success', data: { updated: boolean } }
 * @access Authenticated users
 * @description Marks a conversation as read by resetting its unread count to 0. Also decrements the parent phone number's aggregate unread count.
 */
export const PATCH = withApiAuth<{ wabaId: string; convId: string }>(
  async ({ user, params: { wabaId, convId } }) => {
    const result = await ChatService.markAsRead({
      convId,
      wabaId,
      userId: user.id,
    });
    return jsend.success(result);
  },
);
