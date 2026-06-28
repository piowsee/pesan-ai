import { z } from 'zod';

const TextMessageSchema = z.object({
  body: z.string(),
});

const ContactProfileSchema = z.object({
  name: z.string(),
});

const ContactSchema = z.object({
  profile: ContactProfileSchema.optional(),
  wa_id: z.string(),
});

const BaseWebhookMessageSchema = z.object({
  from: z.string(),
  id: z.string(),
  timestamp: z.string(), // Meta sends it as a string
  type: z.string(),
  text: TextMessageSchema.optional(),
});

const WebhookMessageSchema = BaseWebhookMessageSchema.passthrough();

const WebhookMessageEchoSchema = BaseWebhookMessageSchema.extend({
  to: z.string(),
  to_user_id: z.string().optional(),
}).passthrough();

const WebhookMetadataSchema = z.object({
  display_phone_number: z.string(),
  phone_number_id: z.string(),
});

const WebhookValueSchema = z
  .object({
    messaging_product: z.string(),
    metadata: WebhookMetadataSchema,
    contacts: z.array(ContactSchema).optional(),
    messages: z.array(WebhookMessageSchema).optional(),
  })
  .passthrough();

const WebhookMessageEchoValueSchema = z
  .object({
    messaging_product: z.string(),
    metadata: WebhookMetadataSchema,
    contacts: z.array(ContactSchema).optional(),
    message_echoes: z.array(WebhookMessageEchoSchema).optional(),
  })
  .passthrough();

const WebhookChangeSchema = z.discriminatedUnion('field', [
  z.object({
    field: z.literal('messages'),
    value: WebhookValueSchema,
  }),
  z.object({
    field: z.literal('smb_message_echoes'),
    value: WebhookMessageEchoValueSchema,
  }),
]);

const WebhookEntrySchema = z.object({
  id: z.string(),
  changes: z.array(WebhookChangeSchema).optional(),
});

export const MetaWebhookPayloadSchema = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(WebhookEntrySchema).optional(),
});

export type MetaWebhookPayload = z.infer<typeof MetaWebhookPayloadSchema>;
export type WebhookEntry = z.infer<typeof WebhookEntrySchema>;
export type WebhookValue = z.infer<typeof WebhookValueSchema>;
export type WebhookMessage = z.infer<typeof WebhookMessageSchema>;
export type WebhookMessageEcho = z.infer<typeof WebhookMessageEchoSchema>;
export type WebhookMessageEchoValue = z.infer<
  typeof WebhookMessageEchoValueSchema
>;
export type Contact = z.infer<typeof ContactSchema>;
