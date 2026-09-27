import { withApiAuth } from '@/lib/api-helper/api-handler';
import { jsend } from '@/lib/api-helper/jsend';
import { logger } from '@/lib/server/logger';
import { RequestVerificationCodeSchema } from '@/schemas/phone-registration.schema';
import { PhoneNumberService } from '@/services/phone-number.service';

/**
 * @route POST /api/phone-number/request-code
 * @body { phoneNumberId: string, wabaId: string, codeMethod?: 'SMS' | 'VOICE', language?: string }
 * @response { status: 'success', data: null }
 * @access Authenticated users (must own the WABA)
 * @description Requests a verification code from Meta for a phone number.
 *              The code will be sent via SMS or voice call to the phone number.
 */
export const POST = withApiAuth(async ({ req, user }) => {
  const rawBody = await req.json();
  const { phoneNumberId, wabaId, codeMethod, language } =
    RequestVerificationCodeSchema.parse(rawBody);

  logger.info('Phone verification code requested', {
    userId: user.id,
    phoneNumberId,
    wabaId,
    codeMethod,
  });

  await PhoneNumberService.requestVerificationCode({
    phoneNumberId,
    wabaId,
    userId: user.id,
    codeMethod,
    language,
  });

  return jsend.success(null);
});
