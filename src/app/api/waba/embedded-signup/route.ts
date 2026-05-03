import { withApiAuth } from '@/lib/api-handler';
import { jsend } from '@/lib/jsend';
import { logger } from '@/lib/logger';
import { EmbeddedSignupSchema } from '@/schemas/embedded-signup.schema';
import { EmbeddedSignUpService } from '@/services/embedded-signup.service';

/**
 * @route POST /api/waba/embedded-signup
 * @body { code: string, wabaId: string, phoneNumberId: string, sessionPayload?: unknown }
 * @response { status: 'success', data: { wabaId, phoneNumberId } }
 * @access Authenticated users
 * @description Receives the Embedded Signup authorization code, exchanges it for a
 *              System User Access Token with Meta, then persists the WABA and
 *              PhoneNumber records for the authenticated user.
 */
export const POST = withApiAuth(async ({ req, user }) => {
  const rawBody = await req.json();

  const { code, wabaId, phoneNumberId, sessionPayload } =
    EmbeddedSignupSchema.parse(rawBody);

  logger.info('Embedded signup payload received', {
    userId: user.id,
    hasCode: Boolean(code),
    wabaId,
    phoneNumberId,
    hasSessionPayload: sessionPayload !== undefined,
  });

  const { waba, phoneNumber } = await EmbeddedSignUpService.exchange_token(
    code,
    wabaId,
    phoneNumberId,
    user.id,
  );

  return jsend.success(
    {
      wabaId: waba.wabaId,
      wabaDbId: waba.id,
      phoneNumberId: phoneNumber?.phoneNumberId,
      phoneNumberDbId: phoneNumber?.id,
    },
    201,
  );
});
