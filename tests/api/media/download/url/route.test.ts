import { POST } from '@/app/api/media/download/url/route';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { S3Service } from '@/services/s3.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/media/download/url', { tags: ['backend'] }, () => {
  const url = 'http://localhost/api/media/download/url';
  const key = 'user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000';

  it('returns a presigned GET download URL for stored chat media', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
    } as never);
    vi.mocked(S3Service.createPresignedDownloadUrls).mockResolvedValue([
      {
        key,
        downloadUrl: 'https://space.example/download?signature=abc',
        expiresIn: 1800,
      },
    ]);

    const response = await POST(
      new Request(url, {
        method: 'POST',
        body: JSON.stringify({
          wabaId: 'waba-1',
          convId: 'conv-1',
          keys: [key],
        }),
      }),
      { params: Promise.resolve({}) } as never,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: 'success',
      data: [
        {
          key,
          downloadUrl: 'https://space.example/download?signature=abc',
          expiresIn: 1800,
        },
      ],
    });
    expect(S3Service.createPresignedDownloadUrls).toHaveBeenCalledWith({
      userId: 'user-1',
      wabaId: 'waba-1',
      convId: 'conv-1',
      keys: [key],
    });
  });

  it('rejects invalid media object keys', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
    } as never);

    const response = await POST(
      new Request(url, {
        method: 'POST',
        body: JSON.stringify({
          wabaId: 'waba-1',
          convId: 'conv-1',
          keys: ['bad'],
        }),
      }),
      { params: Promise.resolve({}) } as never,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe('fail');
    expect(body.data.keys).toBeDefined();
    expect(S3Service.createPresignedDownloadUrls).not.toHaveBeenCalled();
  });
});
