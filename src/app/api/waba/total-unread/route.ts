import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { jsend } from '@/lib/jsend';
import { logError } from '@/logger/logger';
import { WabaService } from '@/services/waba.service';

export async function GET() {
  try {
    const userId = await AuthHelper.getUserId();

    const unreadCounts = await WabaService.getTotalUnreadListByUserId(userId);
    return jsend.success({ unreadCounts });
  } catch (err) {
    logError(err, { action: 'GET /api/waba/total-unread' });

    if (err instanceof Error && err.name === 'UnauthorizedError') {
      return jsend.fail({ message: err.message }, 401);
    }

    return jsend.error('Internal Server Error', 500);
  }
}
