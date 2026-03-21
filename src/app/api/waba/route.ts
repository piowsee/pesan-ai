import { withApiAuth } from '@/lib/api-handler';
import { jsend } from '@/lib/jsend';
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
  const rawPage = searchParams.get('page');
  const rawLimit = searchParams.get('limit');

  const hasPagination = rawPage !== null || rawLimit !== null;

  // No Paganition response
  if (!hasPagination) {
    const wabas = isAdmin
      ? await WabaService.getAllWabas()
      : await WabaService.getWabasByUserId(user.id);
    return jsend.success({ wabas });
  }

  // Pagination response
  const page = Math.max(1, Number(rawPage ?? 1));
  const limit = Math.max(1, Math.min(100, Number(rawLimit ?? 10)));

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
