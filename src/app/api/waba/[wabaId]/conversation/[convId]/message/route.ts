import { withApiAuth } from '@/lib/api-handler';
import { jsend } from '@/lib/jsend';
import { getPaginationParams } from '@/lib/pagination';
import { SendMessageSchema } from '@/schemas/message.schema';
import { MessageService } from '@/services/message.service';

/**
 * @route POST /api/waba/:wabaId/conversation/:convId/message
 * @param wabaId {string}
 * @param convId {string}
 * @body { message: string }
 * @response { status: 'success', data: { message: Message } }
 * @access Authenticated users
 * @description Send a text message to a customer via WhatsApp Business API inside a specific conversation.
 */

export const POST = withApiAuth<{ wabaId: string; convId: string }>(
  async ({ user, params: { convId }, req }) => {
    const body = await req.json();
    const validated = SendMessageSchema.safeParse(body);

    if (!validated.success) {
      throw validated.error;
    }

    const { message } = validated.data;

    const result = await MessageService.sendAdminMessage(
      convId,
      user.id,
      message,
    );

    return jsend.success(result);
  },
);

/**
 * @route GET /api/waba/:wabaId/conversation/:convId/message
 * @param wabaId {string}
 * @param convId {string}
 * @query page {number} - Optional, sets the page for pagination
 * @query limit {number} - Optional, sets items per page
 * @response { status: 'success', data: { messages: Message[], total: number, page: number, limit: number } }
 * @access Authenticated users
 * @description Get paginated chat history for a specific conversation.
 */
export const GET = withApiAuth<{ wabaId: string; convId: string }>(
  async ({ req, user, params: { wabaId, convId } }) => {
    const { searchParams } = new URL(req.url);
    const { page, limit } = getPaginationParams(searchParams);

    const { messages, total } = await MessageService.getMessagesPaginated({
      convId,
      wabaId,
      userId: user.id,
      page,
      limit,
    });

    return jsend.success({
      messages,
      total,
      page,
      limit,
    });
  },
);
