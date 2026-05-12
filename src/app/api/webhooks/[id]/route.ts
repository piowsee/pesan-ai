import { withApiAdmin } from '@/lib/api-handler';
import { jsend } from '@/lib/jsend';
import { WebhookService } from '@/services/webhook.service';

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
