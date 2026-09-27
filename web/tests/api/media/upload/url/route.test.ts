import { POST } from '@/app/api/media/upload/url/route';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { S3Service } from '@/services/s3.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/media/upload/url', { tags: ['backend'] }, () => {
  const url = 'http://localhost/api/media/upload/url';

  it('returns a presigned POST upload form for supported media content types', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
    } as never);
    vi.mocked(S3Service.createPresignedUploadUrls).mockResolvedValue([
      {
        key: 'user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000',
        url: 'https://space.example/upload',
        method: 'POST',
        fields: {
          key: 'user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000',
          'Content-Type': 'image/png',
          Policy: 'encoded-policy',
          'X-Amz-Signature': 'signature',
        },
        maxSizeBytes: 5242880,
        expiresIn: 1800,
      },
    ]);

    const response = await POST(
      new Request(url, {
        method: 'POST',
        body: JSON.stringify({
          wabaId: 'waba-1',
          convId: 'conv-1',
          files: [{ contentType: 'image/png' }],
        }),
      }),
      { params: Promise.resolve({}) } as never,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('success');
    expect(body.data[0]?.key).toBe(
      'user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000',
    );
    expect(S3Service.createPresignedUploadUrls).toHaveBeenCalledWith({
      userId: 'user-1',
      wabaId: 'waba-1',
      convId: 'conv-1',
      files: [{ contentType: 'image/png' }],
    });
  });

  it('rejects unsupported content types', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
    } as never);

    const response = await POST(
      new Request(url, {
        method: 'POST',
        body: JSON.stringify({
          wabaId: 'waba-1',
          convId: 'conv-1',
          files: [{ contentType: 'image/gif' }],
        }),
      }),
      { params: Promise.resolve({}) } as never,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe('fail');
    expect(body.data.files).toBeDefined();
    expect(S3Service.createPresignedUploadUrls).not.toHaveBeenCalled();
  });
});
