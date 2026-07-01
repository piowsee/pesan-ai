import { s3Client } from '@/lib/server/s3-client';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { S3Service } from '@/services/s3.service';
import { S3ServiceException } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/s3-client', () => ({
  s3BucketName: 'test-bucket',
  s3Client: { send: vi.fn() },
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}));

vi.mock('@aws-sdk/s3-presigned-post', () => ({
  createPresignedPost: vi.fn(),
}));

vi.unmock('@/services/s3.service');

describe('S3Service', { tags: ['backend'] }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPresignedUploadUrl', () => {
    it('generates a presigned POST form for an image with the image size limit', async () => {
      vi.mocked(
        ConversationRepository.getConversationMetaForSending,
      ).mockResolvedValue({ id: 'conv-1' } as never);
      vi.mocked(createPresignedPost).mockResolvedValue({
        url: 'https://space.example/upload',
        fields: {
          key: 'user-1/waba-1/conv-1/generated-key',
          'Content-Type': 'image/png',
          Policy: 'encoded-policy',
          'X-Amz-Signature': 'signature',
        },
      });

      const result = await S3Service.createPresignedUploadUrl({
        userId: 'user-1',
        wabaId: 'waba-1',
        convId: 'conv-1',
        contentType: 'image/png',
      });
      const presignOptions = vi.mocked(createPresignedPost).mock.calls[0]?.[1];

      expect(result).toEqual({
        key: `/${presignOptions?.Key}`,
        url: 'https://space.example/upload',
        method: 'POST',
        fields: {
          key: 'user-1/waba-1/conv-1/generated-key',
          'Content-Type': 'image/png',
          Policy: 'encoded-policy',
          'X-Amz-Signature': 'signature',
        },
        maxSizeBytes: 5 * 1024 * 1024,
        expiresIn: 1800,
      });
      expect(
        ConversationRepository.getConversationMetaForSending,
      ).toHaveBeenCalledWith({
        convId: 'conv-1',
        wabaId: 'waba-1',
        userId: 'user-1',
      });
      expect(presignOptions).toMatchObject({
        Bucket: 'test-bucket',
        Fields: { 'Content-Type': 'image/png' },
        Conditions: [
          ['eq', '$Content-Type', 'image/png'],
          ['content-length-range', 1, 5 * 1024 * 1024],
        ],
        Expires: 1800,
      });
      expect(presignOptions?.Key).toMatch(
        /^user-1\/waba-1\/conv-1\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('uses the document size limit for supported document uploads', async () => {
      vi.mocked(
        ConversationRepository.getConversationMetaForSending,
      ).mockResolvedValue({ id: 'conv-1' } as never);
      vi.mocked(createPresignedPost).mockResolvedValue({
        url: 'https://space.example/upload',
        fields: {
          key: 'user-1/waba-1/conv-1/generated-key',
          'Content-Type': 'application/pdf',
        },
      });

      const result = await S3Service.createPresignedUploadUrl({
        userId: 'user-1',
        wabaId: 'waba-1',
        convId: 'conv-1',
        contentType: 'application/pdf',
      });
      const presignOptions = vi.mocked(createPresignedPost).mock.calls[0]?.[1];

      expect(result.maxSizeBytes).toBe(100 * 1024 * 1024);
      expect(presignOptions).toMatchObject({
        Fields: { 'Content-Type': 'application/pdf' },
        Conditions: [
          ['eq', '$Content-Type', 'application/pdf'],
          ['content-length-range', 1, 100 * 1024 * 1024],
        ],
        Expires: 1800,
      });
    });

    it('rejects upload URL creation when the conversation is not owned by the user', async () => {
      vi.mocked(
        ConversationRepository.getConversationMetaForSending,
      ).mockResolvedValue(null);

      await expect(
        S3Service.createPresignedUploadUrl({
          userId: 'user-1',
          wabaId: 'waba-1',
          convId: 'conv-1',
          contentType: 'image/png',
        }),
      ).rejects.toMatchObject({
        status: 404,
        message: 'Conversation not found or access denied',
      });
      expect(createPresignedPost).not.toHaveBeenCalled();
    });
  });

  describe('createPresignedDownloadUrl', () => {
    it('generates a presigned GET URL for an owned object key', async () => {
      vi.mocked(getSignedUrl).mockResolvedValue(
        'https://space.example/download?signature=abc',
      );

      const result = await S3Service.createPresignedDownloadUrl({
        userId: 'user-1',
        wabaId: 'waba-1',
        convId: 'conv-1',
        key: '/user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000',
      });
      const command = vi.mocked(getSignedUrl).mock.calls[0]?.[1] as
        | { input?: Record<string, unknown> }
        | undefined;

      expect(result).toEqual({
        downloadUrl: 'https://space.example/download?signature=abc',
        expiresIn: 1800,
      });
      expect(getSignedUrl).toHaveBeenCalledWith(s3Client, expect.anything(), {
        expiresIn: 1800,
      });
      expect(command?.input).toMatchObject({
        Bucket: 'test-bucket',
        Key: 'user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000',
      });
    });
  });
  describe('verifyUploadedMedia', () => {
    it('accepts supported document content types from object metadata', async () => {
      vi.mocked(s3Client.send).mockResolvedValue({
        ContentType: 'application/pdf',
        ContentLength: 1234,
      } as never);

      const result = await S3Service.verifyUploadedMedia({
        userId: 'user-1',
        wabaId: 'waba-1',
        convId: 'conv-1',
        key: '/user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result).toEqual({
        key: '/user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000',
        mediaType: 'document',
        mediaMimeType: 'application/pdf',
        mediaSize: 1234,
      });
    });

    it('returns ApiError 404 when the uploaded object is missing', async () => {
      vi.mocked(s3Client.send).mockRejectedValue(
        new S3ServiceException({
          name: 'NotFound',
          $metadata: { httpStatusCode: 404 },
          message: 'Not found',
          $fault: 'client',
        }),
      );

      await expect(
        S3Service.verifyUploadedMedia({
          userId: 'user-1',
          wabaId: 'waba-1',
          convId: 'conv-1',
          key: '/user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000',
        }),
      ).rejects.toMatchObject({
        status: 404,
        message: 'Upload key not found or access denied',
      });
    });
    it('rejects keys outside the user, WABA, and conversation prefix', async () => {
      await expect(
        S3Service.verifyUploadedMedia({
          userId: 'user-1',
          wabaId: 'waba-1',
          convId: 'conv-1',
          key: '/user-1/waba-2/conv-1/550e8400-e29b-41d4-a716-446655440000',
        }),
      ).rejects.toMatchObject({
        status: 404,
        message: 'Upload key not found or access denied',
      });
      expect(s3Client.send).not.toHaveBeenCalled();
    });

    it('rejects unsupported object metadata content types', async () => {
      vi.mocked(s3Client.send).mockResolvedValue({
        ContentType: 'image/gif',
        ContentLength: 1234,
      } as never);

      await expect(
        S3Service.verifyUploadedMedia({
          userId: 'user-1',
          wabaId: 'waba-1',
          convId: 'conv-1',
          key: '/user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000',
        }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });
});
