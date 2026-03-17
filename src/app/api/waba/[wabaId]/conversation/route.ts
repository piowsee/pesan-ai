import { withApiAuth } from '@/lib/api-handler';
import { jsend } from '@/lib/jsend';
import { ChatService } from '@/services/chat.service';

/**
 * @route GET /api/waba/:wabaId/conversation
 * @param wabaId {string}
 * @response { status: 'success', data: { chats: Conversation[] } }
 * @access Authenticated users
 * @description List all conversations for a specific WABA, validated by user ownership.
 */
export const GET = withApiAuth<{ wabaId: string }>(
  async (userId, { wabaId }) => {
    const chatList = await ChatService.getChatsByWabaId(wabaId, userId);

    if (chatList === null) {
      return jsend.fail({ message: 'WABA not found or access denied' }, 404);
    }

    return jsend.success({ chats: chatList });
  },
);
