import { withApiAuth } from '@/lib/api-helper/api-handler';
import { jsend } from '@/lib/api-helper/jsend';
import { CreateS3DownloadUrlSchema } from '@/schemas/s3-upload.schema';
import { S3Service } from '@/services/s3.service';

/**
 * @route POST /api/media/download/url
 * @body { wabaId: string, convId: string, keys: string[] }
 * @response { status: 'success', data: [{ key, downloadUrl, expiresIn }] }
 * @access Authenticated users
 * @description Creates presigned GET urls for stored chat media objects in bulk.
 */
export const POST = withApiAuth(async ({ req, user }) => {
  const rawBody = await req.json();
  const validated = CreateS3DownloadUrlSchema.parse(rawBody);

  const result = await S3Service.createPresignedDownloadUrls({
    userId: user.id,
    wabaId: validated.wabaId,
    convId: validated.convId,
    keys: validated.keys,
  });

  return jsend.success(result);
});
