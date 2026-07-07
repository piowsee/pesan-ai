import { z } from 'zod';

import { BaseWebhookMessageSchema, WebhookMetadataSchema } from './shared';

// smb_message_echoes still doesn't support user_id - 05 July 2026
export const WebhookMessageEchoSchema = BaseWebhookMessageSchema.extend({
  from: z.string(),
  to: z.string(),
});

export const WebhookMessageEchoValueSchema = z
  .object({
    messaging_product: z.string(),
    metadata: WebhookMetadataSchema,
    message_echoes: z.array(WebhookMessageEchoSchema).optional(),
  })
  .passthrough();

export type WebhookMessageEcho = z.infer<typeof WebhookMessageEchoSchema>;
export type WebhookMessageEchoValue = z.infer<
  typeof WebhookMessageEchoValueSchema
>;
