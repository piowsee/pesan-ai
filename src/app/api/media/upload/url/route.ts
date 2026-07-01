import { withApiAuth } from '@/lib/api-helper/api-handler';
import { jsend } from '@/lib/api-helper/jsend';
import { CreateS3UploadUrlSchema } from '@/schemas/s3-upload.schema';
import { S3Service } from '@/services/s3.service';

/**
 * @route GET /api/media/upload/url
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
