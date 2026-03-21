import { withApiAdmin } from '@/lib/api-handler';
import { jsend } from '@/lib/jsend';
import { WabaService } from '@/services/waba.service';
import { z } from 'zod';

const AssignWebhookSchema = z.object({
  webhookId: z.string().nullable(),
});

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

    const { webhookId } = validated.data;
    const result = await WabaService.assignWebhookToWaba(wabaId, webhookId);

    return jsend.success(result);
  },
);
