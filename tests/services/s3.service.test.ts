import { s3Client } from '@/lib/server/s3-client';
import { S3Service } from '@/services/s3.service';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/s3-client', () => ({
  s3BucketName: 'test-bucket',
  s3Client: { send: vi.fn() },
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
      vi.mocked(createPresignedPost).mockResolvedValue({
        url: 'https://space.example/upload',
        fields: {
          key: 'user-1/generated-key',
          'Content-Type': 'image/png',
          Policy: 'encoded-policy',
          'X-Amz-Signature': 'signature',
        },
      });

      const result = await S3Service.createPresignedUploadUrl({
        userId: 'user-1',
        contentType: 'image/png',
      });
      const presignOptions = vi.mocked(createPresignedPost).mock.calls[0]?.[1];

      expect(result).toEqual({
        key: `/${presignOptions?.Key}`,
        url: 'https://space.example/upload',
        method: 'POST',
        fields: {
          key: 'user-1/generated-key',
          'Content-Type': 'image/png',
          Policy: 'encoded-policy',
          'X-Amz-Signature': 'signature',
        },
        maxSizeBytes: 5 * 1024 * 1024,
        expiresIn: 1800,
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
        /^user-1\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('uses the document size limit for supported document uploads', async () => {
      vi.mocked(createPresignedPost).mockResolvedValue({
        url: 'https://space.example/upload',
        fields: {
          key: 'user-1/generated-key',
          'Content-Type': 'application/pdf',
        },
      });

      const result = await S3Service.createPresignedUploadUrl({
        userId: 'user-1',
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
  });

  describe('verifyUploadedMedia', () => {
    it('accepts supported document content types from object metadata', async () => {
      vi.mocked(s3Client.send).mockResolvedValue({
        ContentType: 'application/pdf',
        ContentLength: 1234,
      } as never);

      const result = await S3Service.verifyUploadedMedia({
        userId: 'user-1',
        key: '/user-1/550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result).toEqual({
        key: '/user-1/550e8400-e29b-41d4-a716-446655440000',
        mediaType: 'document',
        mediaMimeType: 'application/pdf',
        mediaSize: 1234,
      });
    });

    it('rejects unsupported object metadata content types', async () => {
      vi.mocked(s3Client.send).mockResolvedValue({
        ContentType: 'image/gif',
        ContentLength: 1234,
      } as never);

      await expect(
        S3Service.verifyUploadedMedia({
          userId: 'user-1',
          key: '/user-1/550e8400-e29b-41d4-a716-446655440000',
        }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });
});
