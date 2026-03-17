import { withApiAdmin } from '@/lib/api-handler';
import { jsend } from '@/lib/jsend';
import { CreateWebhookSchema } from '@/schemas/create-webhook.schema';
import { WebhookService } from '@/services/webhook.service';

/**
 * @route POST /api/webhook
 * @body { name: string, webhookUrl: string, passphrase: string }
 * @response success with saved webhook data
 * @access Admin only
 * @description take input webhook and passphrase, verify webhook by sending a GET request, and save it if valid.
 */

export const POST = withApiAdmin(async ({ req, userId }) => {
  const rawBody = await req.json();

  const validated = CreateWebhookSchema.safeParse(rawBody);
  if (!validated.success) {
    const fieldErrors = validated.error.flatten().fieldErrors;
    const flatErrors = Object.entries(fieldErrors).reduce(
      (acc, [key, errors]) => {
        acc[key] = errors?.[0] || 'Invalid value';
        return acc;
      },
      {} as Record<string, string>,
    );

    return jsend.fail(flatErrors, 400);
  }

  const data = validated.data;
  const { webhookUrl, passphrase } = data;

  // Validate the webhook URL by sending GET request
  await WebhookService.validateWebhookUrl(webhookUrl, passphrase);

  const webhook = await WebhookService.createWebhook(userId, data);

  return jsend.success({
    webhook,
  });
});
