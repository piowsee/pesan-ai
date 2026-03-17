import { withApiAuth } from '@/lib/api-handler';
import { jsend } from '@/lib/jsend';
import { WabaService } from '@/services/waba.service';

/**
 * @route GET /api/waba/total-unread
 * @param None
 * @response { status: 'success', data: { unreadCounts: { id: string, wabaId: string, totalUnread: number }[] } }
 * @access Authenticated users
 * @description Get the total unread message count for each WhatsApp Business Account (WABA).
 */
export const GET = withApiAuth(async ({ userId }) => {
  const unreadCounts = await WabaService.getTotalUnreadListByUserId(userId);
  return jsend.success({ unreadCounts });
});
