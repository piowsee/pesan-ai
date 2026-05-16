import { z } from 'zod';

export const CreateUserSchema = z.union([
  z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1),
    role: z.enum(['user', 'admin']),
  }),
  z.object({
    email: z.string().email(),
    action: z.literal('resend-onboarding'),
  }),
]);

export type CreateUserPayload = z.infer<typeof CreateUserSchema>;
