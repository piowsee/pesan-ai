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

export const POST = withApiAuth<{ wabaId: string; convId: string }>(
  async ({ user, params: { convId }, req }) => {
    const body = await req.json();
    const validated = SendMessageSchema.safeParse(body);

    if (!validated.success) {
      const fieldErrors = validated.error.flatten().fieldErrors;
      const flatErrors = Object.entries(fieldErrors).reduce(
        (acc, [key, errors]) => {
          acc[key] = errors?.[0] || 'Invalid value';
          return acc;
        },
        {} as Record<string, string>,
      );

      return jsend.fail(flatErrors, 400);
    }

    const { message, token } = validated.data;

    const result = await ChatService.sendAdminMessage(
      convId,
      user.id,
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
  },
);
