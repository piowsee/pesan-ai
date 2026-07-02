import { withApiAuth } from '@/lib/api-helper/api-handler';
import { jsend } from '@/lib/api-helper/jsend';
import { CreateS3DownloadUrlSchema } from '@/schemas/s3-upload.schema';
import { S3Service } from '@/services/s3.service';

/**
 * @route GET /api/media/download/url
 * @query wabaId {string} internal WABA id
 * @query convId {string} conversation id
 * @query key {string} object storage media key
 * @response { status: 'success', data: { downloadUrl, expiresIn } }
 * @access Authenticated users
 * @description Creates a presigned GET URL for a stored chat media object.
 */
export const GET = withApiAuth(async ({ req, user }) => {
  const { searchParams } = new URL(req.url);
  const validated = CreateS3DownloadUrlSchema.parse({
    wabaId: searchParams.get('wabaId'),
    convId: searchParams.get('convId'),
    key: searchParams.get('key'),
  });

  const result = await S3Service.createPresignedDownloadUrl({
    userId: user.id,
    wabaId: validated.wabaId,
    convId: validated.convId,
    key: validated.key,
  });

  return jsend.success(result);
});
