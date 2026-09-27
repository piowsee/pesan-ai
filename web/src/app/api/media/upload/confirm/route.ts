import { withApiAuth } from '@/lib/api-helper/api-handler';
import { jsend } from '@/lib/api-helper/jsend';
import { ConfirmS3UploadSchema } from '@/schemas/s3-upload.schema';
import { MessageService } from '@/services/message.service';

/**
 * @route POST /api/media/upload/confirm
 * @body { wabaId: string, convId: string, files: { key: string, caption?: string, filename?: string }[] }
 * @response { status: 'success', data: [{ message, conversation }] }
 * @access Authenticated users
 * @description Confirms a direct upload batch, verifies the objects exist, saves media messages, and emits realtime updates.
 */
export const POST = withApiAuth(async ({ req, user }) => {
  const rawBody = await req.json();
  const validated = ConfirmS3UploadSchema.parse(rawBody);

  const result = await MessageService.confirmUploadedMediaMessages({
    userId: user.id,
    wabaId: validated.wabaId,
    convId: validated.convId,
    files: validated.files,
  });

  return jsend.success(result);
});
