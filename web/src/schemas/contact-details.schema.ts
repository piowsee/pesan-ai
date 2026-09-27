import { z } from 'zod';

export const UpdateContactDetailsSchema = z.object({
  label: z.string().max(100).nullable().optional(),
  internalNotes: z.string().max(5000).nullable().optional(),
});

export type UpdateContactDetailsInput = z.infer<
  typeof UpdateContactDetailsSchema
>;
