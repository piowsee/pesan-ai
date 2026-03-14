import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { jsend } from '@/lib/jsend';
import { logError } from '@/logger/logger';
import { ChatService } from '@/services/chat.service';

/**
 * @route GET /api/waba/:wabaId/conversation/:convId
 * @param wabaId {string}
 * @param convId {string}
 * @response { status: 'success', data: { conversation: Conversation & { messages: Message[] } } }
 * @access Authenticated users
 * @description Fetch details of a specific conversation including its message history, validated by ownership.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ wabaId: string; convId: string }> },
) {
  const { wabaId, convId } = await params;

  try {
    const userId = await AuthHelper.getUserId();

    const chatDetail = await ChatService.getChatDetail(convId, wabaId, userId);

    if (chatDetail === null) {
      return jsend.fail(
        { message: 'Conversation not found or access denied' },
        404,
      );
    }

    return jsend.success({ conversation: chatDetail });
  } catch (err) {
    logError(err, {
      action: 'GET /api/waba/[wabaId]/conversation/[convId]',
      wabaId,
      convId,
    });

    if (err instanceof Error && err.name === 'UnauthorizedError') {
      return jsend.fail({ message: err.message }, 401);
    }

    return jsend.error('Internal Server Error', 500);
  }
}
