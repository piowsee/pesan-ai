import { withApiAuth } from '@/lib/api-handler';
import { jsend } from '@/lib/jsend';
import { SendMessageSchema } from '@/schemas/message.schema';
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

export const GET = withApiAuth<{ wabaId: string; convId: string }>(
  async ({ req, user, params: { wabaId, convId } }) => {
    const { searchParams } = new URL(req.url);
    const beforeParam = searchParams.get('before');
    const limit = Math.max(
      1,
      Math.min(100, Number(searchParams.get('limit') ?? 30)),
    );
    const before = beforeParam ? new Date(beforeParam) : undefined;

    const messages = await ChatService.getChatMessages({
      convId,
      wabaId,
      userId: user.id,
      before: before && !Number.isNaN(before.getTime()) ? before : undefined,
      limit,
    });

    return jsend.success(messages);
  },
);

export const POST = withApiAuth<{ wabaId: string; convId: string }>(
  async ({ user, params: { convId }, req }) => {
    const body = await req.json();
    const validated = SendMessageSchema.safeParse(body);

    if (!validated.success) {
      throw validated.error;
    }

    const { message, token } = validated.data;

    const result = await ChatService.sendAdminMessage(
      convId,
      user.id,
      message,
      token,
    );

    return jsend.success({
      message:
        result && typeof result === 'object' && 'message' in result
          ? result.message
          : result,
    });
  },
);
