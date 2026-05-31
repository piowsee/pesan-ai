import { withApiAuth } from '@/lib/api-handler';
import { jsend } from '@/lib/jsend';
import { logger } from '@/lib/logger';
import { RequestVerificationCodeSchema } from '@/schemas/phone-registration.schema';
import { PhoneRegistrationService } from '@/services/phone-registration.service';

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

  await PhoneRegistrationService.requestVerificationCode({
    phoneNumberId,
    wabaId,
    userId: user.id,
    codeMethod,
    language,
  });

  return jsend.success(null);
});
