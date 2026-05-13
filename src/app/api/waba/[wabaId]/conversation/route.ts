import { withApiAuth } from '@/lib/api-handler';
import { jsend } from '@/lib/jsend';
import { ConversationService } from '@/services/conversation.service';

/**
 * @route GET /api/waba/:wabaId/conversation
 * @param wabaId {string}
 * @response { status: 'success', data: { chats: Conversation[], total: number } }
 * @access Authenticated users
 * @description List all conversations for a specific WABA, validated by user ownership (bypasses pagination). Includes latest message per conversation.
 */
export const GET = withApiAuth<{ wabaId: string }>(
  async ({ user, params: { wabaId } }) => {
    const { conversations, total } =
      await ConversationService.getAllConversations({
        wabaId,
        userId: user.id,
      });

    return jsend.success({
      chats: conversations,
      total,
    });
  },
);
