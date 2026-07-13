import { withApiAuth } from '@/lib/api-helper/api-handler';
import { jsend } from '@/lib/api-helper/jsend';
import { logger } from '@/lib/server/logger';
import { EmbeddedSignupSchema } from '@/schemas/embedded-signup.schema';
import { EmbeddedSignUpService } from '@/services/embedded-signup.service';

/**
 * @route POST /api/embedded-signup
 * @body { code: string, sessionPayload: EmbeddedSignupSessionPayload }
 * @response { status: 'success', data: { wabaId, wabaDbId, phoneNumbers } }
 * @access Authenticated users
 * @description Receives the Embedded Signup authorization code, exchanges it for a
 *              System User Access Token with Meta, then persists the WABA and
 *              PhoneNumber records for the authenticated user.
 */
export const POST = withApiAuth(async ({ req, user }) => {
  const rawBody = await req.json();

  const { code, sessionPayload } = EmbeddedSignupSchema.parse(rawBody);

  const event = sessionPayload.event;
  const wabaId = sessionPayload.data?.waba_id;
  const phoneNumberId = sessionPayload.data?.phone_number_id;

  if (!event || !wabaId || !phoneNumberId) {
    return jsend.error(
      'Missing event, waba id, or phone number id in session payload. Please make sure to complete the phone number registration step.',
      400,
    );
  }

  logger.info('Embedded signup payload received', {
    userId: user.id,
    hasCode: Boolean(code),
    event,
    wabaId,
    phoneNumberId,
  });

  const { phoneNumbers, waba } =
    await EmbeddedSignUpService.completeEmbeddedSignup({
      code,
      event,
      userId: user.id,
      wabaId,
      phoneNumberId,
    });

  return jsend.success(
    {
      wabaId: waba.wabaId,
      wabaDbId: waba.id,
      phoneNumbers,
    },
    201,
  );
});
