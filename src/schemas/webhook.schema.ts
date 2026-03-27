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

const WebhookMessageSchema = z
  .object({
    from: z.string(),
    id: z.string(),
    timestamp: z.string(), // Meta sends it as a string
    type: z.string(),
    text: TextMessageSchema.optional(),
    // Add other message types (image, audio, etc.) here if needed in the future
  })
  .passthrough(); // Allow extra properties sent by Meta

const WebhookMetadataSchema = z.object({
  display_phone_number: z.string(),
  phone_number_id: z.string(),
});

const WebhookStatusErrorSchema = z
  .object({
    code: z.number().optional(),
    title: z.string().optional(),
    message: z.string().optional(),
  })
  .passthrough();

const WebhookStatusSchema = z
  .object({
    id: z.string(),
    status: z.string(),
    timestamp: z.string().optional(),
    recipient_id: z.string().optional(),
    errors: z.array(WebhookStatusErrorSchema).optional(),
  })
  .passthrough();

const WebhookValueSchema = z
  .object({
    messaging_product: z.string(),
    metadata: WebhookMetadataSchema,
    contacts: z.array(ContactSchema).optional(),
    messages: z.array(WebhookMessageSchema).optional(),
    statuses: z.array(WebhookStatusSchema).optional(),
  })
  .passthrough();

const WebhookChangeSchema = z.object({
  field: z.literal('messages'),
  value: WebhookValueSchema,
});

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
export type Contact = z.infer<typeof ContactSchema>;
export type WebhookStatus = z.infer<typeof WebhookStatusSchema>;
