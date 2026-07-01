import { ApiError } from '@/lib/api-helper/error';
import { logger } from '@/lib/server/logger';
import { s3BucketName, s3Client } from '@/lib/server/s3-client';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { getSupportedUploadConfig } from '@/schemas/s3-upload.schema';
import {
  GetObjectCommand,
  HeadObjectCommand,
  type HeadObjectCommandOutput,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS = 1800;
const PRESIGNED_DOWNLOAD_EXPIRES_IN_SECONDS = 1800;

function createObjectKey(params: {
  userId: string;
  wabaId: string; // Internal DB WhatsappBusinessAccount.id.
  convId: string; // Internal DB Conversation.id.
}) {
  return `${params.userId}/${params.wabaId}/${params.convId}/${randomUUID()}`;
}

function assertUserOwnsKey(params: {
  key: string;
  userId: string;
  wabaId: string;
  convId: string;
}) {
  const objectKey = params.key;
  const expectedPrefix = `${params.userId}/${params.wabaId}/${params.convId}/`;

  if (!objectKey.startsWith(expectedPrefix)) {
    throw new ApiError('Upload key not found or access denied', 404);
  }

  return objectKey;
}

export const S3Service = {
  async createPresignedUploadUrl(params: {
    userId: string;
    wabaId: string; // Internal DB WhatsappBusinessAccount.id.
    convId: string; // Internal DB Conversation.id.
    contentType: string;
  }) {
    const uploadConfig = getSupportedUploadConfig(params.contentType);

    if (!uploadConfig) {
      throw new ApiError('Unsupported upload content type', 400);
    }

    const conversationMeta =
      await ConversationRepository.getConversationMetaForSending({
        convId: params.convId,
        wabaId: params.wabaId,
        userId: params.userId,
      });

    if (!conversationMeta) {
      throw new ApiError('Conversation not found or access denied', 404);
    }

    const objectKey = createObjectKey(params);

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
      key: objectKey,
      userId: params.userId,
      wabaId: params.wabaId,
      convId: params.convId,
    });

    return {
      key: objectKey,
      url,
      method: 'POST' as const,
      fields,
      maxSizeBytes: uploadConfig.maxSizeBytes,
      expiresIn: PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS,
    };
  },

  async streamWhatsAppMediaToObjectStorage(params: {
    whatsappUrl: string;
    token: string;
    userId: string;
    wabaId: string; // Internal DB WhatsappBusinessAccount.id.
    convId: string; // Internal DB Conversation.id.
    contentType?: string | null;
  }) {
    const response = await fetch(params.whatsappUrl, {
      headers: { Authorization: `Bearer ${params.token}` },
    });

    if (!response.ok || !response.body) {
      throw new ApiError(
        `Failed to fetch WhatsApp media: ${response.status}`,
        502,
      );
    }

    const rawContentType =
      params.contentType || response.headers.get('content-type');
    const uploadConfig = getSupportedUploadConfig(rawContentType);

    if (!rawContentType || !uploadConfig) {
      throw new ApiError('WhatsApp media content type is not supported', 400);
    }

    const contentLengthHeader = response.headers.get('content-length');
    const mediaSize = contentLengthHeader ? Number(contentLengthHeader) : null;

    if (mediaSize !== null && mediaSize > uploadConfig.maxSizeBytes) {
      throw new ApiError('WhatsApp media exceeds maximum upload size', 400);
    }

    const objectKey = createObjectKey(params);
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: s3BucketName,
        Key: objectKey,
        Body: response.body,
        ContentType: rawContentType,
      },
      queueSize: 4,
      partSize: 5 * 1024 * 1024,
    });

    upload.on('httpUploadProgress', (progress) => {
      logger.info('Streaming WhatsApp media upload progress', {
        key: objectKey,
        loaded: progress.loaded,
        total: progress.total,
      });
    });

    await upload.done();

    logger.info('Streamed WhatsApp media to object storage', {
      key: objectKey,
      userId: params.userId,
      wabaId: params.wabaId,
      convId: params.convId,
    });

    return {
      key: objectKey,
      mediaType: uploadConfig.mediaType,
      mediaMimeType: rawContentType,
      mediaSize,
    };
  },

  async verifyUploadedMedia(params: {
    userId: string;
    wabaId: string; // Internal DB WhatsappBusinessAccount.id.
    convId: string; // Internal DB Conversation.id.
    key: string;
  }) {
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
      key: objectKey,
      mediaType: uploadConfig.mediaType,
      mediaMimeType,
      mediaSize: object.ContentLength ?? null,
    };
  },

  async createPresignedDownloadUrl(params: {
    userId: string;
    wabaId: string; // Internal DB WhatsappBusinessAccount.id.
    convId: string; // Internal DB Conversation.id.
    key: string;
  }) {
    const objectKey = assertUserOwnsKey(params);
    const command = new GetObjectCommand({
      Bucket: s3BucketName,
      Key: objectKey,
    });

    const downloadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: PRESIGNED_DOWNLOAD_EXPIRES_IN_SECONDS,
    });

    logger.info('Created S3 presigned GET download url', {
      key: objectKey,
      userId: params.userId,
    });

    return {
      downloadUrl,
      expiresIn: PRESIGNED_DOWNLOAD_EXPIRES_IN_SECONDS,
    };
  },
};
