import { withApiAuth } from '@/lib/api-helper/api-handler';
import { jsend } from '@/lib/api-helper/jsend';
import { getPaginationParams } from '@/lib/api-helper/pagination';
import { PhoneNumberService } from '@/services/phone-number.service';

/**
 * @route GET /api/customer-phone-number
 * @query wabaId {string} - Optional internal WABA id filter
 * @query phoneNumber {string} - Optional business/admin phone number filter from the PhoneNumber table
 * @query page {number} - Optional page number; enables pagination when present
 * @query limit {number} - Optional items per page; enables pagination when present
 * @response { status: 'success', data: { customerPhoneNumbers, total, page?, limit? } }
 * @access Authenticated users
 * @description Returns unique customer phone numbers that have ever chatted with the user's owned WhatsApp numbers.
 */
export const GET = withApiAuth(async ({ req, user }) => {
  const { searchParams } = new URL(req.url);
  const wabaId = searchParams.get('wabaId')?.trim() || undefined;
  const phoneNumber = searchParams.get('phoneNumber')?.trim() || undefined;
  const usePagination = searchParams.has('page') || searchParams.has('limit');
  const pagination = usePagination
    ? getPaginationParams(searchParams)
    : undefined;

  const { customerPhoneNumbers, total } =
    await PhoneNumberService.getCustomerPhoneNumbers({
      userId: user.id,
      wabaId,
      phoneNumber,
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
