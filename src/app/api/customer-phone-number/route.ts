import { withApiAuth } from '@/lib/api-helper/api-handler';
import { jsend } from '@/lib/api-helper/jsend';
import { getPaginationParams } from '@/lib/api-helper/pagination';
import { CustomerPhoneNumberService } from '@/services/customer-phone-number.service';

function getQueryValues(searchParams: URLSearchParams, key: string) {
  const values = Array.from(
    new Set(
      searchParams
        .getAll(key)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );

  return values.length > 0 ? values : undefined;
}

/**
 * @route GET /api/customer-phone-number
 * @query wabaId {string[]} - Optional repeated Pesan-AI internal WABA ids (WhatsappBusinessAccount.id), not Meta wabaId
 * @query phoneNumber {string[]} - Optional repeated business/admin phone number filters from the PhoneNumber table
 * @query page {number} - Optional page number; enables pagination when present
 * @query limit {number} - Optional items per page; enables pagination when present
 * @response { status: 'success', data: { customerPhoneNumbers, total, page?, limit? } }
 * @access Authenticated users
 * @description Returns unique customer contacts that have ever chatted with the user's owned WhatsApp numbers.
 */
export const GET = withApiAuth(async ({ req, user }) => {
  const { searchParams } = new URL(req.url);
  const wabaIds = getQueryValues(searchParams, 'wabaId');
  const phoneNumbers = getQueryValues(searchParams, 'phoneNumber');
  const usePagination = searchParams.has('page') || searchParams.has('limit');
  const pagination = usePagination
    ? getPaginationParams(searchParams)
    : undefined;

  const { customerPhoneNumbers, total } =
    await CustomerPhoneNumberService.getCustomerPhoneNumbers({
      userId: user.id,
      wabaIds,
      phoneNumbers,
      page: pagination?.page,
      limit: pagination?.limit,
    });

  return jsend.success({
    customerPhoneNumbers,
    total,
    ...(pagination
      ? {
          page: pagination.page,
          limit: pagination.limit,
        }
      : {}),
  });
});
