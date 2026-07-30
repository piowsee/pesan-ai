import { z } from 'zod';

export const CreateWebhookSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  webhookUrl: z.url('Invalid webhook URL'),
  passphrase: z.string().min(1, 'Passphrase is required'),
});

export type CreateWebhookPayload = z.infer<typeof CreateWebhookSchema>;

export const UpdateWebhookSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100).optional(),
    webhookUrl: z.url('Invalid webhook URL').optional(),
    passphrase: z.string().min(1, 'Passphrase is required').optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.webhookUrl !== undefined ||
      data.passphrase !== undefined,
    { message: 'At least one field must be provided' },
  );

export type UpdateWebhookPayload = z.infer<typeof UpdateWebhookSchema>;
