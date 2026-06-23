import { z } from 'zod';

export const RequestAccountSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  companyName: z.string().trim().max(160).optional(),
  phoneNumber: z.string().trim().max(40).regex(/^\d*$/).optional(),
  message: z.string().trim().max(1000).optional(),
});

export type RequestAccountPayload = z.infer<typeof RequestAccountSchema>;
