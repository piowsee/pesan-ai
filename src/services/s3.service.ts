import { ApiError } from '@/lib/api-helper/error';
import { logger } from '@/lib/server/logger';
import { s3BucketName, s3Client } from '@/lib/server/s3-client';
import { getSupportedUploadConfig } from '@/schemas/s3-upload.schema';
import {
  GetObjectCommand,
  HeadObjectCommand,
  type HeadObjectCommandOutput,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS = 1800;
const PRESIGNED_DOWNLOAD_EXPIRES_IN_SECONDS = 1800;

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
    let object: HeadObjectCommandOutput;

    try {
      object = await s3Client.send(
        new HeadObjectCommand({
          Bucket: s3BucketName,
          Key: objectKey,
        }),
      );
    } catch (error) {
      // The S3 SDK throws provider-specific errors; convert missing objects
      // to our API error contract so upload confirmation returns a JSend 404.
      if (
        error instanceof S3ServiceException &&
        error.$metadata.httpStatusCode === 404
      ) {
        throw new ApiError('Upload key not found or access denied', 404);
      }

      throw error;
    }

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

  async createPresignedDownloadUrl(params: { userId: string; key: string }) {
    const objectKey = assertUserOwnsKey(params);
    const command = new GetObjectCommand({
      Bucket: s3BucketName,
      Key: objectKey,
    });

    const downloadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: PRESIGNED_DOWNLOAD_EXPIRES_IN_SECONDS,
    });

    logger.info('Created S3 presigned GET download url', {
      key: toPublicMediaKey(objectKey),
      userId: params.userId,
    });

    return {
      downloadUrl,
      expiresIn: PRESIGNED_DOWNLOAD_EXPIRES_IN_SECONDS,
    };
  },
};
