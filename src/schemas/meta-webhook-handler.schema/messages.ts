import { z } from 'zod';

import {
  BaseWebhookMessageSchema,
  ContactSchema,
  WebhookMetadataSchema,
} from './shared';

export const WebhookMessageSchema = BaseWebhookMessageSchema.extend({
  from: z.string().optional(),
  from_user_id: z.string(),
});

const WebhookStatusErrorSchema = z
  .object({
    code: z.number().optional(),
    title: z.string().optional(),
    message: z.string().optional(),
    error_data: z
      .object({
        details: z.string().optional(),
      })
      .passthrough()
      .optional(),
    href: z.string().optional(),
  })
  .passthrough();

const WebhookStatusConversationSchema = z
  .object({
    id: z.string().optional(),
    expiration_timestamp: z.string().optional(),
    origin: z
      .object({
        type: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const WebhookStatusPricingSchema = z
  .object({
    billable: z.boolean().optional(),
    pricing_model: z.string().optional(),
    type: z.string().optional(),
    category: z.string().optional(),
  })
  .passthrough();

export const WebhookStatusSchema = z
  .object({
    id: z.string(),
    status: z.string(),
    timestamp: z.string().optional(),
    recipient_id: z.string().optional(),
    recipient_user_id: z.string().optional(),
    recipient_type: z.string().optional(),
    recipient_participant_id: z.string().optional(),
    recipient_identity_key_hash: z.string().optional(),
    biz_opaque_callback_data: z.string().optional(),
    conversation: WebhookStatusConversationSchema.optional(),
    pricing: WebhookStatusPricingSchema.optional(),
    errors: z.array(WebhookStatusErrorSchema).optional(),
  })
  .passthrough();

export const WebhookValueSchema = z
  .object({
    messaging_product: z.literal('whatsapp'),
    metadata: WebhookMetadataSchema,
    contacts: z.array(ContactSchema).optional(),
    messages: z.array(WebhookMessageSchema).optional(),
    statuses: z.array(WebhookStatusSchema).optional(),
  })
  .passthrough();

export type WebhookValue = z.infer<typeof WebhookValueSchema>;
export type WebhookMessage = z.infer<typeof WebhookMessageSchema>;
export type WebhookStatus = z.infer<typeof WebhookStatusSchema>;
