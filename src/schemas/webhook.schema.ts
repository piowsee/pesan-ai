import { z } from 'zod';

// --- Message content payloads ---

const TextMessageSchema = z.object({
  body: z.string(),
});

const WebhookMediaAssetSchema = z
  .object({
    caption: z.string().optional(),
    mime_type: z.string().optional(),
    sha256: z.string().optional(),
    id: z.string(),
    url: z.string(),
  })
  .passthrough();

const AudioMessageSchema = WebhookMediaAssetSchema.extend({
  voice: z.boolean().optional(),
});

const DocumentMessageSchema = WebhookMediaAssetSchema.extend({
  filename: z.string().optional(),
});

// --- Contact payloads ---

const ContactProfileSchema = z.object({
  name: z.string().optional(),
  username: z.string().optional(),
});

const ContactSchema = z.object({
  profile: ContactProfileSchema.optional(),
  wa_id: z.string().optional(),
  user_id: z.string(),
});

// --- Message payloads ---

const BaseWebhookMessageSchema = z
  .object({
    id: z.string(),
    timestamp: z.string(), // Meta sends it as a string
    type: z.string(),
    text: TextMessageSchema.optional(),
    image: WebhookMediaAssetSchema.optional(),
    audio: AudioMessageSchema.optional(),
    video: WebhookMediaAssetSchema.optional(),
    document: DocumentMessageSchema.optional(),
  })
  .passthrough();

const WebhookMessageSchema = BaseWebhookMessageSchema.extend({
  from: z.string().optional(),
  from_user_id: z.string(),
});

// smb_message_echoes still doesn't support user_id - 05 July 2026
const WebhookMessageEchoSchema = BaseWebhookMessageSchema.extend({
  from: z.string(),
  to: z.string(),
});

// --- Webhook value payloads ---

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
    message_echoes: z.array(WebhookMessageEchoSchema).optional(),
  })
  .passthrough();

// --- Webhook envelope ---

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

// --- Exported types ---

export type MetaWebhookPayload = z.infer<typeof MetaWebhookPayloadSchema>;
export type WebhookEntry = z.infer<typeof WebhookEntrySchema>;
export type WebhookValue = z.infer<typeof WebhookValueSchema>;
export type WebhookMessage = z.infer<typeof WebhookMessageSchema>;
export type WebhookMessageEcho = z.infer<typeof WebhookMessageEchoSchema>;
export type WebhookMessageEchoValue = z.infer<
  typeof WebhookMessageEchoValueSchema
>;
export type Contact = z.infer<typeof ContactSchema>;
