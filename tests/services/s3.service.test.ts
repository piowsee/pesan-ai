import { s3Client } from '@/lib/server/s3-client';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { S3Service } from '@/services/s3.service';
import { S3ServiceException } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
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

vi.mock('@aws-sdk/lib-storage', () => ({
  Upload: vi.fn(),
}));

vi.mock('@aws-sdk/s3-presigned-post', () => ({
  createPresignedPost: vi.fn(),
}));

vi.unmock('@/services/s3.service');

describe('S3Service', { tags: ['backend'] }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe('createPresignedUploadUrls', () => {
    it('generates a presigned POST form for an image with the image size limit', async () => {
      vi.mocked(
        ConversationRepository.getConversationMetaForSending,
      ).mockResolvedValue({
        id: 'conv-1',
        lastCustomerMessageAt: new Date(),
        phoneNumber: { waba: { status: 'active' } },
      } as never);
      vi.mocked(createPresignedPost).mockResolvedValue({
        url: 'https://space.example/upload',
        fields: {
          key: 'user-1/waba-1/conv-1/generated-key',
          'Content-Type': 'image/png',
          Policy: 'encoded-policy',
          'X-Amz-Signature': 'signature',
        },
      });

      const result = await S3Service.createPresignedUploadUrls({
        userId: 'user-1',
        wabaId: 'waba-1',
        convId: 'conv-1',
        files: [{ contentType: 'image/png' }],
      });
      const presignOptions = vi.mocked(createPresignedPost).mock.calls[0]?.[1];

      expect(result[0]).toEqual({
        key: presignOptions?.Key,
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
      ).mockResolvedValue({
        id: 'conv-1',
        lastCustomerMessageAt: new Date(),
        phoneNumber: { waba: { status: 'active' } },
      } as never);
      vi.mocked(createPresignedPost).mockResolvedValue({
        url: 'https://space.example/upload',
        fields: {
          key: 'user-1/waba-1/conv-1/generated-key',
          'Content-Type': 'application/pdf',
        },
      });

      const result = await S3Service.createPresignedUploadUrls({
        userId: 'user-1',
        wabaId: 'waba-1',
        convId: 'conv-1',
        files: [{ contentType: 'application/pdf' }],
      });
      const presignOptions = vi.mocked(createPresignedPost).mock.calls[0]?.[1];

      expect(result[0]?.maxSizeBytes).toBe(100 * 1024 * 1024);
      expect(presignOptions).toMatchObject({
        Fields: { 'Content-Type': 'application/pdf' },
        Conditions: [
          ['eq', '$Content-Type', 'application/pdf'],
          ['content-length-range', 1, 100 * 1024 * 1024],
        ],
        Expires: 1800,
      });
    });

    it('rejects upload URL creation when the WABA is not active', async () => {
      vi.mocked(
        ConversationRepository.getConversationMetaForSending,
      ).mockResolvedValue({
        id: 'conv-1',
        lastCustomerMessageAt: new Date(),
        phoneNumber: { waba: { status: 'disconnected' } },
      } as never);

      await expect(
        S3Service.createPresignedUploadUrls({
          userId: 'user-1',
          wabaId: 'waba-1',
          convId: 'conv-1',
          files: [{ contentType: 'image/png' }],
        }),
      ).rejects.toMatchObject({
        status: 409,
        message:
          'Cannot upload media because this WhatsApp Business account (WABA) is not active.',
      });
      expect(createPresignedPost).not.toHaveBeenCalled();
    });

    it('rejects upload URL creation outside the 24-hour customer service window', async () => {
      vi.mocked(
        ConversationRepository.getConversationMetaForSending,
      ).mockResolvedValue({
        id: 'conv-1',
        lastCustomerMessageAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        phoneNumber: { waba: { status: 'active' } },
      } as never);

      await expect(
        S3Service.createPresignedUploadUrls({
          userId: 'user-1',
          wabaId: 'waba-1',
          convId: 'conv-1',
          files: [{ contentType: 'image/png' }],
        }),
      ).rejects.toMatchObject({
        status: 409,
        message:
          'Cannot upload media because the 24-hour customer service window is closed.',
      });
      expect(createPresignedPost).not.toHaveBeenCalled();
    });

    it('rejects upload URL creation when the conversation has no customer message window', async () => {
      vi.mocked(
        ConversationRepository.getConversationMetaForSending,
      ).mockResolvedValue({
        id: 'conv-1',
        lastCustomerMessageAt: null,
        phoneNumber: { waba: { status: 'active' } },
      } as never);

      await expect(
        S3Service.createPresignedUploadUrls({
          userId: 'user-1',
          wabaId: 'waba-1',
          convId: 'conv-1',
          files: [{ contentType: 'image/png' }],
        }),
      ).rejects.toMatchObject({
        status: 409,
        message:
          'Cannot upload media because the 24-hour customer service window is closed.',
      });
      expect(createPresignedPost).not.toHaveBeenCalled();
    });

    it('rejects upload URL creation when the conversation is not owned by the user', async () => {
      vi.mocked(
        ConversationRepository.getConversationMetaForSending,
      ).mockResolvedValue(null);

      await expect(
        S3Service.createPresignedUploadUrls({
          userId: 'user-1',
          wabaId: 'waba-1',
          convId: 'conv-1',
          files: [{ contentType: 'image/png' }],
        }),
      ).rejects.toMatchObject({
        status: 404,
        message: 'Conversation not found or access denied',
      });
      expect(createPresignedPost).not.toHaveBeenCalled();
    });
  });

  describe('streamWhatsAppMediaToObjectStorage', () => {
    it('streams WhatsApp media into object storage with an explicit object key', async () => {
      const responseBody = new ReadableStream();
      const done = vi.fn().mockResolvedValue({});
      const on = vi.fn();

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          body: responseBody,
          headers: new Headers({
            'content-type': 'image/png',
            'content-length': '1234',
          }),
        }),
      );
      vi.mocked(Upload).mockImplementation(function (options) {
        return { on, done, options } as never;
      });

      const result = await S3Service.streamWhatsAppMediaToObjectStorage({
        whatsappUrl: 'https://lookaside.whatsapp.com/media-1',
        token: 'meta-token',
        userId: 'user-1',
        wabaId: 'waba-1',
        convId: 'conv-1',
        contentType: 'image/png',
      });
      const uploadOptions = vi.mocked(Upload).mock.calls[0]?.[0];

      expect(fetch).toHaveBeenCalledWith(
        'https://lookaside.whatsapp.com/media-1',
        {
          headers: { Authorization: 'Bearer meta-token' },
        },
      );
      expect(uploadOptions).toMatchObject({
        client: s3Client,
        params: {
          Bucket: 'test-bucket',
          ContentType: 'image/png',
          Body: responseBody,
        },
        queueSize: 4,
        partSize: 5 * 1024 * 1024,
      });
      expect(uploadOptions?.params?.Key).toMatch(
        /^user-1\/waba-1\/conv-1\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(on).toHaveBeenCalledWith(
        'httpUploadProgress',
        expect.any(Function),
      );
      expect(done).toHaveBeenCalled();
      expect(result).toEqual({
        key: uploadOptions?.params?.Key,
        mediaType: 'image',
        mediaMimeType: 'image/png',
        mediaSize: 1234,
      });
    });
  });

  describe('createPresignedDownloadUrls', () => {
    it('generates a presigned GET URL for an owned object key', async () => {
      vi.mocked(getSignedUrl).mockResolvedValue(
        'https://space.example/download?signature=abc',
      );

      const result = await S3Service.createPresignedDownloadUrls({
        userId: 'user-1',
        wabaId: 'waba-1',
        convId: 'conv-1',
        keys: ['user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000'],
      });
      const command = vi.mocked(getSignedUrl).mock.calls[0]?.[1] as
        | { input?: Record<string, unknown> }
        | undefined;

      expect(result[0]).toEqual({
        key: 'user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000',
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
        key: 'user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result).toEqual({
        key: 'user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000',
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
          key: 'user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000',
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
          key: 'user-1/waba-2/conv-1/550e8400-e29b-41d4-a716-446655440000',
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
          key: 'user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000',
        }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });
});
