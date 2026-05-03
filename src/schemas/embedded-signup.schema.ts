import { z } from 'zod';

export const EmbeddedSignupSchema = z.object({
  code: z.string().min(1),
  wabaId: z.string(),
  phoneNumberId: z.string().nullable(),
  sessionPayload: z.unknown().optional(),
});
