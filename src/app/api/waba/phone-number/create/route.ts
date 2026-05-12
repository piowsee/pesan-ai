import { withApiAuth } from '@/lib/api-handler';
import { jsend } from '@/lib/jsend';
import { logger } from '@/lib/logger';
import { CreatePhoneNumberSchema } from '@/schemas/phone-registration.schema';
import { PhoneRegistrationService } from '@/services/phone-registration.service';

/**
 * @route POST /api/waba/phone-number/create
 * @body { wabaId: string, countryCode?: string, phoneNumber: string, name: string }
 * @response { status: 'success', data: { phoneNumberId: string } }
 * @access Authenticated users (must own the WABA)
 * @description Creates a new phone number in Meta for the given WABA.
 */
export const POST = withApiAuth(async ({ req, user }) => {
  const rawBody = await req.json();
  const params = CreatePhoneNumberSchema.parse(rawBody);

  logger.info('Creating new phone number for WABA', {
    userId: user.id,
    wabaId: params.wabaId,
    phoneNumber: params.phoneNumber,
  });

  const data = await PhoneRegistrationService.createPhoneNumber({
    wabaId: params.wabaId,
    userId: user.id,
    countryCode: params.countryCode,
    phoneNumber: params.phoneNumber,
    name: params.name,
  });

  return jsend.success(data);
});
