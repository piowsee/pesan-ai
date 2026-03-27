import { withApiAdmin } from '@/lib/api-handler';
import { jsend } from '@/lib/jsend';
import { getPaginationParams } from '@/lib/pagination';
import { CreateWebhookSchema } from '@/schemas/create-webhook.schema';
import { WebhookService } from '@/services/webhook.service';

/**
 * @route POST /api/webhook
 * @body { name: string, webhookUrl: string, passphrase: string }
 * @response { status: 'success', data: { webhook: BotWebhook } }
 * @access Admin only
 * @description take input webhook and passphrase, verify webhook by sending a GET request, and save it if valid.
 */

export const POST = withApiAdmin(async ({ req, user }) => {
  const rawBody = await req.json();

  const validated = CreateWebhookSchema.safeParse(rawBody);
  if (!validated.success) {
    throw validated.error;
  }

  const data = validated.data;
  const { webhookUrl, passphrase } = data;

  // Validate the webhook URL by sending GET request
  await WebhookService.validateWebhookUrl(webhookUrl, passphrase);

  const webhook = await WebhookService.createWebhook(user.id, data);

  return jsend.success({
    webhook,
  });
});

/**
 * @route GET /api/webhook
 * @query page {number} - Page number (optional, enables pagination)
 * @query limit {number} - Items per page (default: 10, only used with page)
 * @response { status: 'success', data: { webhooks, total?, page?, limit? } }
 * @access Admin only
 * @description Returns all webhooks when no query params are passed. Supports pagination via page/limit.
 */
export const GET = withApiAdmin(async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const { page, limit } = getPaginationParams(searchParams);

  const { webhooks, total } = await WebhookService.getWebhooksPaginated(
    page,
    limit,
  );

  return jsend.success({
    webhooks,
    total,
    page,
    limit,
  });
});
