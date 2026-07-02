import { withApiAuth } from '@/lib/api-helper/api-handler';
import { jsend } from '@/lib/api-helper/jsend';
import { ConfirmS3UploadSchema } from '@/schemas/s3-upload.schema';
import { MessageService } from '@/services/message.service';

/**
 * @route POST /api/media/upload/confirm
 * @body { wabaId: string, convId: string, key: string, caption?: string, filename?: string }
 * @response { status: 'success', data: { message, conversation } }
 * @access Authenticated users
 * @description Confirms a direct upload, verifies the object exists, saves a media message, and emits realtime updates.
 */
export const POST = withApiAuth(async ({ req, user }) => {
  const rawBody = await req.json();
  const validated = ConfirmS3UploadSchema.parse(rawBody);

  const result = await MessageService.confirmUploadedMediaMessage({
    userId: user.id,
    wabaId: validated.wabaId,
    convId: validated.convId,
    key: validated.key,
    caption: validated.caption,
    filename: validated.filename,
  });

  return jsend.success(result);
});
