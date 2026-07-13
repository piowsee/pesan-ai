import { z } from 'zod';

export const EmbeddedSignupEventSchema = z.enum([
  'FINISH',
  'FINISH_ONLY_WABA',
  'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
  'FINISH_OBO_MIGRATION',
  'FINISH_GRANT_ONLY_API_ACCESS',
]);

export const EmbeddedSignupSessionPayloadSchema = z
  .object({
    phone_number_id: z.string().optional(),
    waba_id: z.string().optional(),
    business_id: z.string().optional(),
    ad_account_ids: z.array(z.string()).optional(),
    page_ids: z.array(z.string()).optional(),
    dataset_ids: z.array(z.string()).optional(),
    catalog_ids: z.array(z.string()).optional(),
    instagram_account_ids: z.array(z.string()).optional(),
    waba_ids: z.array(z.string()).optional(),
  })
  .passthrough();

export type EmbeddedSignupSessionPayload = z.infer<
  typeof EmbeddedSignupSessionPayloadSchema
>;

export const EmbeddedSignupSchema = z.object({
  code: z.string().min(1),
  event: EmbeddedSignupEventSchema,
  sessionPayload: EmbeddedSignupSessionPayloadSchema,
});
