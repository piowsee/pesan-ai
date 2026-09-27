import { z } from 'zod';

export const StateSyncContactSchema = z.object({
  full_name: z.string().optional(),
  first_name: z.string().optional(),
  phone_number: z.string(),
});

export const StateSyncEntrySchema = z.object({
  type: z.string(),
  contact: StateSyncContactSchema.optional(),
  action: z.string(),
  metadata: z
    .object({
      timestamp: z.string().optional(),
    })
    .optional(),
});

export const SmbAppStateSyncValueSchema = z.object({
  messaging_product: z.literal('whatsapp'),
  metadata: z.object({
    display_phone_number: z.string(),
    phone_number_id: z.string(),
  }),
  state_sync: z.array(StateSyncEntrySchema).optional(),
});

export type StateSyncContact = z.infer<typeof StateSyncContactSchema>;
export type StateSyncEntry = z.infer<typeof StateSyncEntrySchema>;
export type SmbAppStateSyncValue = z.infer<typeof SmbAppStateSyncValueSchema>;
