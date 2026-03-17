import { withApiAuth } from '@/lib/api-handler';
import { jsend } from '@/lib/jsend';
import { WabaService } from '@/services/waba.service';

/**
 * @route GET /api/waba
 * @param None
 * @response { status: 'success', data: { wabas: WhatsappBusinessAccount[] } }
 * @access Authenticated users
 * @description List all WhatsApp Business Accounts (WABAs) associated with the current user.
 */
export const GET = withApiAuth(async ({ userId }) => {
  const wabas = await WabaService.getWabasByUserId(userId);
  return jsend.success({ wabas });
});
