import { z } from 'zod';

export const CreateWebhookSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  webhookUrl: z.url('Invalid webhook URL'),
  passphrase: z.string().min(1, 'Passphrase is required'),
});

export type CreateWebhookPayload = z.infer<typeof CreateWebhookSchema>;
