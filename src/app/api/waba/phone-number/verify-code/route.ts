import { withApiAuth } from '@/lib/api-handler';
import { jsend } from '@/lib/jsend';
import { logger } from '@/lib/logger';
import { VerifyAndRegisterSchema } from '@/schemas/phone-registration.schema';
import { PhoneRegistrationService } from '@/services/phone-registration.service';

/**
 * @route POST /api/waba/phone-number/verify-code
 * @body { phoneNumberId: string, wabaId: string, code: string (otp_code) }
 * @response { status: 'success', data: null }
 * @access Authenticated users (must own the WABA)
 * @description Verify Phone Number via OTP (called after /request-code)
 */
export const POST = withApiAuth(async ({ req, user }) => {
  const rawBody = await req.json();
  const {
    phoneNumberId,
    wabaId,
    code: otp_code,
  } = VerifyAndRegisterSchema.parse(rawBody);

  logger.info('Phone verification code requested', {
    userId: user.id,
    phoneNumberId,
    wabaId,
    otp_code,
  });

  await PhoneRegistrationService.verifyAndRegister({
    phoneNumberId,
    wabaId,
    userId: user.id,
    code: otp_code,
  });

  return jsend.success(null);
});
