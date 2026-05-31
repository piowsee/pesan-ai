import { withApiAuth } from '@/lib/api-helper/api-handler';
import { jsend } from '@/lib/api-helper/jsend';
import { logger } from '@/lib/server/logger';
import { EmbeddedSignupSchema } from '@/schemas/embedded-signup.schema';
import { EmbeddedSignUpService } from '@/services/embedded-signup.service';

/**
 * @route POST /api/embedded-signup
 * @body { code: string, wabaId: string, sessionPayload?: unknown }
 * @response { status: 'success', data: { wabaId, wabaDbId, phoneNumbers, message, failedPhoneNumberIds } }
 * @access Authenticated users
 * @description Receives the Embedded Signup authorization code, exchanges it for a
 *              System User Access Token with Meta, then persists the WABA and
 *              PhoneNumber records for the authenticated user.
 */
export const POST = withApiAuth(async ({ req, user }) => {
  const rawBody = await req.json();

  const { code, wabaId, sessionPayload } = EmbeddedSignupSchema.parse(rawBody);

  logger.info('Embedded signup payload received', {
    userId: user.id,
    hasCode: Boolean(code),
    wabaId,
    hasSessionPayload: sessionPayload !== undefined,
  });

  const { failedPhoneNumberIds, message, phoneNumbers, waba } =
    await EmbeddedSignUpService.completeEmbeddedSignup({
      code,
      wabaId,
      userId: user.id,
    });

  return jsend.success(
    {
      failedPhoneNumberIds,
      message,
      wabaId: waba.wabaId,
      wabaDbId: waba.id,
      phoneNumbers,
    },
    201,
  );
});
