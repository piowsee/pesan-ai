import { withApiAuth } from '@/lib/api-handler';
import { jsend } from '@/lib/jsend';
import { ChatService } from '@/services/chat.service';

/**
 * @route GET /api/waba/:wabaId/conversation/:convId
 * @param wabaId {string}
 * @param convId {string}
 * @response { status: 'success', data: { conversation: Conversation & { messages: Message[] } } }
 * @access Authenticated users
 * @description Fetch details of a specific conversation including its message history, validated by ownership.
 */
export const GET = withApiAuth<{ wabaId: string; convId: string }>(
  async ({ user, params: { wabaId, convId } }) => {
    const chatDetail = await ChatService.getChatDetail(convId, wabaId, user.id);

    if (chatDetail === null) {
      return jsend.fail(
        { message: 'Conversation not found or access denied' },
        404,
      );
    }

    return jsend.success({ conversation: chatDetail });
  },
);
