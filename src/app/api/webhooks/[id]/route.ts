import { withApiAdmin } from '@/lib/api-helper/api-handler';
import { jsend } from '@/lib/api-helper/jsend';
import { UpdateWebhookSchema } from '@/schemas/webhook.schema';
import { WebhookService } from '@/services/webhook.service';

/**
 * @route PATCH /api/webhooks/:id
 * @body { name?: string, webhookUrl?: string, passphrase?: string, refreshConnection?: boolean }
 * @response { status: 'success', data: { webhook: BotWebhook } }
 * @access Admin only
 * @description Updates a webhook. Supports renaming, URL change, passphrase change, and connection refresh.
 */
export const PATCH = withApiAdmin<{ id: string }>(
  async ({ req, params: { id } }) => {
    const rawBody = await req.json();
    const data = UpdateWebhookSchema.parse(rawBody);

    const webhook = await WebhookService.updateWebhook({ id, data });

    return jsend.success({
      webhook,
    });
  },
);

/**
 * @route DELETE /api/webhooks/:id
 * @param id {string}
 * @response success
 * @access Admin only
 */
export const DELETE = withApiAdmin<{ id: string }>(
  async ({ params: { id } }) => {
    await WebhookService.deleteWebhook({ id });

    return jsend.success({
      message: 'Webhook deleted successfully',
    });
  },
);
