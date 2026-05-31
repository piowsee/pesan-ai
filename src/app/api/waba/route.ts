import { withApiAuth } from '@/lib/api-helper/api-handler';
import { jsend } from '@/lib/api-helper/jsend';
import { getPaginationParams } from '@/lib/api-helper/pagination';
import { WabaService } from '@/services/waba.service';

/**
 * @route GET /api/waba
 * @param None
 * @query page {number} - Optional, sets the page for pagination
 * @query limit {number} - Optional, sets items per page
 * @response { status: 'success', data: { wabas: WhatsappBusinessAccount[], total?: number, page?: number, limit?: number } }
 * @access Authenticated users (admins get all WABAs, strictly paginated/unpaginated)
 * @description List WhatsApp Business Accounts (WABAs). If admin, lists all. If regular user, lists own.
 */
export const GET = withApiAuth(async ({ req, user }) => {
  const isAdmin = user.role === 'admin';

  const { searchParams } = new URL(req.url);
  const { page, limit } = getPaginationParams(searchParams);

  const { wabas, total } = await WabaService.getWabasPaginated({
    page,
    limit,
    userId: isAdmin ? undefined : user.id,
  });

  return jsend.success({
    wabas,
    total,
    page,
    limit,
  });
});
