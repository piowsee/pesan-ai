import { ApiError } from '@/lib/api-helper/error';
import { logger } from '@/lib/server/logger';
import { s3BucketName, s3Client } from '@/lib/server/s3-client';
import { getSupportedUploadConfig } from '@/schemas/s3-upload.schema';
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { randomUUID } from 'crypto';

const PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS = 1800;

function toPublicMediaKey(objectKey: string) {
  return `/${objectKey}`;
}

function toObjectKey(publicKey: string) {
  return publicKey.replace(/^\/+/, '');
}

// check object's key userId
function assertUserOwnsKey(params: { key: string; userId: string }) {
  const objectKey = toObjectKey(params.key);
  if (!objectKey.startsWith(`${params.userId}/`)) {
    throw new ApiError('Upload key not found or access denied', 404);
  }

  return objectKey;
}

export const S3Service = {
  async createPresignedUploadUrl(params: {
    userId: string;
    contentType: string;
  }) {
    const objectKey = `${params.userId}/${randomUUID()}`;
    const uploadConfig = getSupportedUploadConfig(params.contentType);

    if (!uploadConfig) {
      throw new ApiError('Unsupported upload content type', 400);
    }

    const { url, fields } = await createPresignedPost(s3Client, {
      Bucket: s3BucketName,
      Key: objectKey,
      Fields: {
        'Content-Type': params.contentType,
      },
      Conditions: [
        ['eq', '$Content-Type', params.contentType],
        ['content-length-range', 1, uploadConfig.maxSizeBytes],
      ],
      Expires: PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS,
    });

    logger.info('Created S3 presigned POST URL', {
      key: toPublicMediaKey(objectKey),
      userId: params.userId,
    });

    return {
      key: toPublicMediaKey(objectKey),
      url,
      method: 'POST' as const,
      fields,
      maxSizeBytes: uploadConfig.maxSizeBytes,
      expiresIn: PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS,
    };
  },

  async verifyUploadedMedia(params: { userId: string; key: string }) {
    const objectKey = assertUserOwnsKey(params);
    const object = await s3Client.send(
      new HeadObjectCommand({
        Bucket: s3BucketName,
        Key: objectKey,
      }),
    );

    const mediaMimeType = object.ContentType ?? null;
    const uploadConfig = getSupportedUploadConfig(mediaMimeType);

    if (!uploadConfig) {
      throw new ApiError('Uploaded object content type is not supported', 400);
    }

    return {
      key: toPublicMediaKey(objectKey),
      mediaType: uploadConfig.mediaType,
      mediaMimeType,
      mediaSize: object.ContentLength ?? null,
    };
  },
};
