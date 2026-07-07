import { z } from 'zod';

export const TextMessageSchema = z.object({
  body: z.string(),
});

export const WebhookMediaAssetSchema = z
  .object({
    caption: z.string().optional(),
    mime_type: z.string().optional(),
    sha256: z.string().optional(),
    id: z.string(),
    url: z.string(),
  })
  .passthrough();

export const AudioMessageSchema = WebhookMediaAssetSchema.extend({
  voice: z.boolean().optional(),
});

export const DocumentMessageSchema = WebhookMediaAssetSchema.extend({
  filename: z.string().optional(),
});

const ContactProfileSchema = z.object({
  name: z.string().optional(),
  username: z.string().optional(),
});

export const ContactSchema = z.object({
  profile: ContactProfileSchema.optional(),
  wa_id: z.string().optional(),
  user_id: z.string().optional(),
});

export const BaseWebhookMessageSchema = z
  .object({
    id: z.string(),
    timestamp: z.string(),
    type: z.string(),
    text: TextMessageSchema.optional(),
    image: WebhookMediaAssetSchema.optional(),
    audio: AudioMessageSchema.optional(),
    video: WebhookMediaAssetSchema.optional(),
    document: DocumentMessageSchema.optional(),
  })
  .passthrough();

export const WebhookMetadataSchema = z.object({
  display_phone_number: z.string(),
  phone_number_id: z.string(),
});

export type Contact = z.infer<typeof ContactSchema>;
