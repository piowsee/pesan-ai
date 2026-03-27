import { withApiAuth } from '@/lib/api-handler';
import { jsend } from '@/lib/jsend';
import { ChatService } from '@/services/chat.service';
import type { ChatSidebarFilter } from '@/types/chat';

/**
 * @route GET /api/waba/:wabaId/conversation
 * @param wabaId {string}
 * @response { status: 'success', data: { chats: Conversation[] } }
 * @access Authenticated users
 * @description List all conversations for a specific WABA, validated by user ownership.
 */
export const GET = withApiAuth<{ wabaId: string }>(
  async ({ req, user, params: { wabaId } }) => {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit = Math.max(
      1,
      Math.min(100, Number(searchParams.get('limit') ?? 25)),
    );
    const search = searchParams.get('q')?.trim() || undefined;
    const filter = (searchParams.get('filter') ?? 'all') as ChatSidebarFilter;
    const phoneNumberId = searchParams.get('phoneNumberId') || undefined;

    const chatList = await ChatService.getChatsByWabaId({
      wabaId,
      userId: user.id,
      page,
      limit,
      search,
      filter: filter === 'unread' ? 'unread' : 'all',
      phoneNumberId,
    });

    return jsend.success(chatList);
  },
);
