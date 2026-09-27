import { z } from 'zod';

export const WhatsAppBusinessProfileUpdateSchema = z.object({
  messaging_product: z.literal('whatsapp'),
  about: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  profile_picture_handle: z.string().optional().nullable(),
  websites: z.array(z.string().url()).optional(),
  vertical: z.string().optional().nullable(),
});
