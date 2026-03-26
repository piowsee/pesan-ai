import { z } from 'zod';

export const AssignWebhookSchema = z.object({
  webhookId: z.string().nullable(),
});
