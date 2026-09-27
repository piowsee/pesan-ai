import { z } from 'zod';

const MB = 1024 * 1024;

// @see https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages
export const SUPPORTED_UPLOAD_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'audio/aac',
  'audio/amr',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'video/3gpp',
  'video/mp4',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/pdf',
] as const;

export type SupportedUploadContentType =
  (typeof SUPPORTED_UPLOAD_CONTENT_TYPES)[number];

export type UploadMediaType = 'image' | 'audio' | 'video' | 'document';

export const SUPPORTED_UPLOAD_CONFIG = {
  'image/jpeg': { mediaType: 'image', maxSizeBytes: 5 * MB },
  'image/png': { mediaType: 'image', maxSizeBytes: 5 * MB },
  'audio/aac': { mediaType: 'audio', maxSizeBytes: 16 * MB },
  'audio/amr': { mediaType: 'audio', maxSizeBytes: 16 * MB },
  'audio/mpeg': { mediaType: 'audio', maxSizeBytes: 16 * MB },
  'audio/mp4': { mediaType: 'audio', maxSizeBytes: 16 * MB },
  'audio/ogg': { mediaType: 'audio', maxSizeBytes: 16 * MB },
  'video/3gpp': { mediaType: 'video', maxSizeBytes: 16 * MB },
  'video/mp4': { mediaType: 'video', maxSizeBytes: 16 * MB },
  'text/plain': { mediaType: 'document', maxSizeBytes: 100 * MB },
  'application/vnd.ms-excel': {
    mediaType: 'document',
    maxSizeBytes: 100 * MB,
  },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    mediaType: 'document',
    maxSizeBytes: 100 * MB,
  },
  'application/msword': { mediaType: 'document', maxSizeBytes: 100 * MB },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    mediaType: 'document',
    maxSizeBytes: 100 * MB,
  },
  'application/vnd.ms-powerpoint': {
    mediaType: 'document',
    maxSizeBytes: 100 * MB,
  },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
    mediaType: 'document',
    maxSizeBytes: 100 * MB,
  },
  'application/pdf': { mediaType: 'document', maxSizeBytes: 100 * MB },
} satisfies Record<
  SupportedUploadContentType,
  { mediaType: UploadMediaType; maxSizeBytes: number }
>;

export function normalizeContentType(contentType?: string | null) {
  return contentType?.split(';')[0]?.trim().toLowerCase() || null;
}

export function getSupportedUploadConfig(contentType?: string | null) {
  const normalizedContentType = normalizeContentType(contentType);
  if (!normalizedContentType) return null;

  return (
    SUPPORTED_UPLOAD_CONFIG[
      normalizedContentType as SupportedUploadContentType
    ] ?? null
  );
}

export const MediaContentTypeSchema = z
  .string()
  .transform((contentType) => normalizeContentType(contentType))
  .pipe(z.string())
  .refine(
    (contentType) => getSupportedUploadConfig(contentType) !== null,
    'Unsupported upload content type',
  );

const UploadPathSegmentSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[^/]+$/);

export const CreateS3UploadUrlSchema = z.object({
  wabaId: UploadPathSegmentSchema,
  convId: UploadPathSegmentSchema,
  files: z
    .array(
      z.object({
        contentType: MediaContentTypeSchema,
      }),
    )
    .min(1)
    .max(10), // Limiting to max 10 concurrent uploads per batch for stability
});

const S3MediaObjectKeySchema = z
  .string()
  .regex(
    /^[^/]+\/[^/]+\/[^/]+\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    'Invalid media object key',
  );

export const ConfirmS3UploadSchema = z.object({
  wabaId: UploadPathSegmentSchema,
  convId: UploadPathSegmentSchema,
  files: z
    .array(
      z.object({
        key: S3MediaObjectKeySchema,
        caption: z.string().trim().max(4096).optional(),
        filename: z.string().trim().min(1).max(255).optional(),
      }),
    )
    .min(1),
});

export const CreateS3DownloadUrlSchema = z.object({
  wabaId: UploadPathSegmentSchema,
  convId: UploadPathSegmentSchema,
  keys: z.array(S3MediaObjectKeySchema).min(1),
});

export type CreateS3UploadUrlInput = z.infer<typeof CreateS3UploadUrlSchema>;

export type ConfirmS3UploadInput = z.infer<typeof ConfirmS3UploadSchema>;

export type CreateS3DownloadUrlInput = z.infer<
  typeof CreateS3DownloadUrlSchema
>;
