import { withApiAuth } from '@/lib/api-handler';
import { jsend } from '@/lib/jsend';
import { ChatService } from '@/services/chat.service';

export const PATCH = withApiAuth<{ wabaId: string; convId: string }>(
  async ({ user, params: { wabaId, convId } }) => {
    const result = await ChatService.markConversationAsRead(
      convId,
      wabaId,
      user.id,
    );

    return jsend.success(result);
  },
);
