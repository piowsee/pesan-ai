import { withApiAdmin } from '@/lib/api-helper/api-handler';
import { jsend } from '@/lib/api-helper/jsend';
import { WebhookService } from '@/services/webhook.service';

/**
 * @route POST /api/webhooks/:id/refresh
 * @param id {string}
 * @response success
 * @access Admin only
 * @description Pings the webhook URL with its current passphrase to verify the connection is still active.
 */
export const POST = withApiAdmin<{ id: string }>(async ({ params: { id } }) => {
  await WebhookService.refreshWebhookConnection({ id });

  return jsend.success({
    message: 'Connection verified successfully',
  });
});
