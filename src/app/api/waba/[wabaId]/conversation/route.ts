import { withApiAuth } from '@/lib/api-handler';
import { jsend } from '@/lib/jsend';
import { getPaginationParams } from '@/lib/pagination';
import { ChatService } from '@/services/chat.service';

/**
 * @route GET /api/waba/:wabaId/conversation
 * @param wabaId {string}
 * @query page {number} - Optional, sets the page for pagination
 * @query limit {number} - Optional, sets items per page
 * @response { status: 'success', data: { chats: Conversation[], total: number, page: number, limit: number } }
 * @access Authenticated users
 * @description List all conversations for a specific WABA, validated by user ownership. Includes latest message per conversation.
 */
export const GET = withApiAuth<{ wabaId: string }>(
  async ({ req, user, params: { wabaId } }) => {
    const { searchParams } = new URL(req.url);
    const { page, limit } = getPaginationParams(searchParams);

    const { chats, total } = await ChatService.getChatsPaginated(
      wabaId,
      user.id,
      page,
      limit,
    );

    return jsend.success({
      chats,
      total,
      page,
      limit,
    });
  },
);
