import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { jsend } from '@/lib/jsend';
import { logError } from '@/logger/logger';
import { ChatService } from '@/services/chat.service';

/**
 * @route POST /api/waba/:wabaId/conversation/:convId/message
 * @param wabaId {string}
 * @param convId {string}
 * @body { message: string, token?: string }
 * @response { status: 'success', data: { message: Message } }
 * @access Authenticated users
 * @description Send a text message to a customer via WhatsApp Business API inside a specific conversation.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ wabaId: string; convId: string }> },
) {
  const { wabaId, convId } = await params;

  try {
    const { message, token } = await req.json();
    const userId = await AuthHelper.getUserId();

    if (!message) {
      return jsend.fail({ message: 'Message content is required' }, 400);
    }

    const result = await ChatService.sendAdminMessage(
      convId,
      userId,
      message,
      token,
    );

    if (result === null) {
      return jsend.fail(
        { message: 'Conversation not found or access denied' },
        404,
      );
    }

    return jsend.success({ message: result });
  } catch (err) {
    logError(err, {
      action: 'POST /api/waba/[wabaId]/conversation/[convId]/message',
      wabaId,
      convId,
    });

    if (err instanceof Error && err.name === 'UnauthorizedError') {
      return jsend.fail({ message: err.message }, 401);
    }

    return jsend.error(
      err instanceof Error ? err.message : 'Internal Server Error',
      500,
    );
  }
}
