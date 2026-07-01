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

export function getSupportedUploadConfig(contentType?: string | null) {
  if (!contentType) return null;

  return (
    SUPPORTED_UPLOAD_CONFIG[contentType as SupportedUploadContentType] ?? null
  );
}

export const MediaContentTypeSchema = z
  .string()
  .trim()
  .toLowerCase()
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
  contentType: MediaContentTypeSchema,
});

export const ConfirmS3UploadSchema = z.object({
  wabaId: UploadPathSegmentSchema,
  convId: UploadPathSegmentSchema,
  key: z
    .string()
    .regex(
      /^[^/]+\/[^/]+\/[^/]+\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      'Invalid upload key',
    ),
  caption: z.string().trim().max(4096).optional(),
});

export type CreateS3UploadUrlInput = z.infer<typeof CreateS3UploadUrlSchema>;

export type ConfirmS3UploadInput = z.infer<typeof ConfirmS3UploadSchema>;
