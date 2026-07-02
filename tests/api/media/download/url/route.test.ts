import { GET } from '@/app/api/media/download/url/route';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { S3Service } from '@/services/s3.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/media/download/url', { tags: ['backend'] }, () => {
  const url = 'http://localhost/api/media/download/url';
  const key = 'user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000';

  it('returns a presigned GET download URL for stored chat media', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
    } as never);
    vi.mocked(S3Service.createPresignedDownloadUrl).mockResolvedValue({
      downloadUrl: 'https://space.example/download?signature=abc',
      expiresIn: 1800,
    });

    const response = await GET(
      new Request(
        `${url}?wabaId=waba-1&convId=conv-1&key=${encodeURIComponent(key)}`,
        { method: 'GET' },
      ),
      { params: Promise.resolve({}) } as never,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: 'success',
      data: {
        downloadUrl: 'https://space.example/download?signature=abc',
        expiresIn: 1800,
      },
    });
    expect(S3Service.createPresignedDownloadUrl).toHaveBeenCalledWith({
      userId: 'user-1',
      wabaId: 'waba-1',
      convId: 'conv-1',
      key,
    });
  });

  it('rejects invalid media object keys', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
    } as never);

    const response = await GET(
      new Request(`${url}?wabaId=waba-1&convId=conv-1&key=bad`, {
        method: 'GET',
      }),
      { params: Promise.resolve({}) } as never,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe('fail');
    expect(body.data.key).toBeDefined();
    expect(S3Service.createPresignedDownloadUrl).not.toHaveBeenCalled();
  });
});
