import { z } from 'zod';

export const SendMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Message content is required')
    .max(4096, 'Message content cannot exceed 4096 characters'),
});

export type SendMessageSchema = z.infer<typeof SendMessageSchema>;
