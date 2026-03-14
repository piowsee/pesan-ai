import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { jsend } from '@/lib/jsend';
import { logError } from '@/logger/logger';
import { WabaService } from '@/services/waba.service';

/**
 * @route GET /api/waba
 * @param None
 * @response { status: 'success', data: { wabaList: WhatsappBusinessAccount[] } }
 * @access Authenticated users
 * @description List all WhatsApp Business Accounts (WABAs) associated with the current user.
 */
export async function GET() {
  try {
    const userId = await AuthHelper.getUserId();

    const wabaList = await WabaService.getWabasByUserId(userId);
    return jsend.success({ wabaList });
  } catch (err) {
    logError(err, { action: 'GET /api/waba' });

    if (err instanceof Error && err.name === 'UnauthorizedError') {
      return jsend.fail({ message: err.message }, 401);
    }

    return jsend.error('Internal Server Error', 500);
  }
}
