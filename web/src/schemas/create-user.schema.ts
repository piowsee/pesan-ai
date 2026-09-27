import { z } from 'zod';

export const CreateUserSchema = z.union([
  z.object({
    email: z.string().email(),
    name: z.string().min(1),
    role: z.enum(['user', 'admin']),
  }),
  z.object({
    email: z.string().email(),
    action: z.literal('resend-onboarding'),
  }),
]);

export type CreateUserPayload = z.infer<typeof CreateUserSchema>;
