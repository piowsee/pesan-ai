import { withApiAdmin } from '@/lib/api-handler';
import { jsend } from '@/lib/jsend';
import { AssignWebhookSchema } from '@/schemas/assign-webhook.schema';
import { WabaService } from '@/services/waba.service';

/**
 * @route PATCH /api/waba/[wabaId]/webhook
 * @body { webhookId: string | null }
 * @response { status: 'success', data: { success: true } }
 * @access Admin only
 * @description Assigns or unassigns a webhook to all phone numbers under a WABA.
 */
export const PATCH = withApiAdmin<{ wabaId: string }>(
  async ({ req, params: { wabaId } }) => {
    const rawBody = await req.json();

    const validated = AssignWebhookSchema.safeParse(rawBody);
    if (!validated.success) {
      throw validated.error;
    }

    const { webhookId } = validated.data;
    const result = await WabaService.assignWebhookToWaba(wabaId, webhookId);

    return jsend.success(result);
  },
);
