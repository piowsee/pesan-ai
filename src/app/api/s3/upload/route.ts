import { withApiAuth } from '@/lib/api-helper/api-handler';
import { jsend } from '@/lib/api-helper/jsend';
import {
  ConfirmS3UploadSchema,
  CreateS3UploadUrlSchema,
} from '@/schemas/s3-upload.schema';
import { MessageService } from '@/services/message.service';
import { S3Service } from '@/services/s3.service';

/**
 * @route GET /api/s3/upload
 * @query wabaId {string} internal WABA id
 * @query convId {string} conversation id
 * @query contentType {string} supported image, audio, video, or document MIME type
 * @response { status: 'success', data: { key, url, method, fields, maxSizeBytes, expiresIn } }
 * @access Authenticated users
 * @description Creates a presigned POST upload form for direct browser upload to object storage.
 */
export const GET = withApiAuth(async ({ req, user }) => {
  const { searchParams } = new URL(req.url);
  const validated = CreateS3UploadUrlSchema.parse({
    wabaId: searchParams.get('wabaId'),
    convId: searchParams.get('convId'),
    contentType: searchParams.get('contentType'),
  });

  const result = await S3Service.createPresignedUploadUrl({
    userId: user.id,
    wabaId: validated.wabaId,
    convId: validated.convId,
    contentType: validated.contentType,
  });

  return jsend.success(result);
});

/**
 * @route POST /api/s3/upload
 * @body { wabaId: string, convId: string, key: string, caption?: string }
 * @response { status: 'success', data: null }
 * @access Authenticated users
 * @description Confirms a direct upload, verifies the object exists, saves a media message, and emits realtime updates.
 */
export const POST = withApiAuth(async ({ req, user }) => {
  const rawBody = await req.json();
  const validated = ConfirmS3UploadSchema.parse(rawBody);

  await MessageService.confirmUploadedMediaMessage({
    userId: user.id,
    wabaId: validated.wabaId,
    convId: validated.convId,
    key: validated.key,
    caption: validated.caption,
  });

  return jsend.success();
});
