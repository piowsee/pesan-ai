import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { jsend } from '@/lib/jsend';
import { logError } from '@/logger/logger';
import { ChatService } from '@/services/chat.service';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ wabaId: string }> },
) {
  try {
    const { wabaId } = await params;
    const userId = await AuthHelper.getUserId();

    const chatList = await ChatService.getChatsByWabaId(wabaId, userId);

    if (chatList === null) {
      return jsend.fail({ message: 'WABA not found or access denied' }, 404);
    }

    return jsend.success({ chats: chatList });
  } catch (err) {
    logError(err, { action: 'GET /api/waba/[wabaId]/chat' });

    if (err instanceof Error && err.name === 'UnauthorizedError') {
      return jsend.fail({ message: err.message }, 401);
    }

    return jsend.error('Internal Server Error', 500);
  }
}
