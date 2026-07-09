import { z } from 'zod';

import { WebhookMessageSchema } from './messages';

export const HistoryMetadataSchema = z.object({
  phase: z.number(),
  chunk_order: z.number(),
  progress: z.number(),
});

export const HistoryMessageSchema = WebhookMessageSchema.extend({
  history_context: z
    .object({
      status: z.string(),
    })
    .optional(),
});

export const HistoryThreadSchema = z.object({
  id: z.string(),
  messages: z.array(HistoryMessageSchema).optional(),
});

export const HistoryErrorSchema = z.object({
  code: z.number(),
  title: z.string(),
  message: z.string().optional(),
  error_data: z
    .object({
      details: z.string(),
    })
    .optional(),
});

export const HistoryEntrySchema = z.object({
  metadata: HistoryMetadataSchema.optional(),
  threads: z.array(HistoryThreadSchema).optional(),
  errors: z.array(HistoryErrorSchema).optional(),
});

export const HistoryValueSchema = z.object({
  messaging_product: z.literal('whatsapp'),
  metadata: z.object({
    display_phone_number: z.string(),
    phone_number_id: z.string(),
  }),
  history: z.array(HistoryEntrySchema).optional(),
  messages: z.array(HistoryMessageSchema).optional(),
});

export type HistoryMetadata = z.infer<typeof HistoryMetadataSchema>;
export type HistoryMessage = z.infer<typeof HistoryMessageSchema>;
export type HistoryThread = z.infer<typeof HistoryThreadSchema>;
export type HistoryError = z.infer<typeof HistoryErrorSchema>;
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;
export type HistoryValue = z.infer<typeof HistoryValueSchema>;
