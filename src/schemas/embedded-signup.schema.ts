import { z } from 'zod';

export const EmbeddedSignupEventSchema = z.enum([
  'FINISH',
  'FINISH_ONLY_WABA',
  'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
  'FINISH_OBO_MIGRATION',
  'FINISH_GRANT_ONLY_API_ACCESS',
]);

export const EmbeddedSignupSchema = z.object({
  code: z.string().min(1),
  event: EmbeddedSignupEventSchema,
  wabaId: z.string(),
  sessionPayload: z.unknown().optional(),
});
