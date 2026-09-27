import { withApiAuth } from '@/lib/api-helper/api-handler';
import { jsend } from '@/lib/api-helper/jsend';
import { CreateS3UploadUrlSchema } from '@/schemas/s3-upload.schema';
import { S3Service } from '@/services/s3.service';

/**
 * @route POST /api/media/upload/url
 * @body { wabaId: string, convId: string, files: { contentType: string }[] }
 * @response { status: 'success', data: [{ key, url, method, fields, maxSizeBytes, expiresIn }] }
 * @access Authenticated users
 * @description Creates presigned POST upload forms for direct browser bulk uploads to object storage.
 */
export const POST = withApiAuth(async ({ req, user }) => {
  const rawBody = await req.json();
  const validated = CreateS3UploadUrlSchema.parse(rawBody);

  const result = await S3Service.createPresignedUploadUrls({
    userId: user.id,
    wabaId: validated.wabaId,
    convId: validated.convId,
    files: validated.files,
  });

  return jsend.success(result);
});
