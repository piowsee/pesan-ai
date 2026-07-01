import { GET, POST } from '@/app/api/s3/upload/route';
import { ApiError } from '@/lib/api-helper/error';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { MessageService } from '@/services/message.service';
import { S3Service } from '@/services/s3.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/s3/upload', { tags: ['backend'] }, () => {
  const url = 'http://localhost/api/s3/upload';

  it('returns a presigned POST upload form for supported media content types', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
    } as never);
    vi.mocked(S3Service.createPresignedUploadUrl).mockResolvedValue({
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
    });

    const response = await GET(
      new Request(`${url}?wabaId=waba-1&convId=conv-1&contentType=image/png`, {
        method: 'GET',
      }),
      { params: Promise.resolve({}) } as never,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('success');
    expect(body.data.key).toBe(
      'user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000',
    );
    expect(S3Service.createPresignedUploadUrl).toHaveBeenCalledWith({
      userId: 'user-1',
      wabaId: 'waba-1',
      convId: 'conv-1',
      contentType: 'image/png',
    });
  });

  it('rejects unsupported content types', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
    } as never);

    const response = await GET(
      new Request(`${url}?wabaId=waba-1&convId=conv-1&contentType=image/gif`, {
        method: 'GET',
      }),
      { params: Promise.resolve({}) } as never,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe('fail');
    expect(body.data.contentType).toBeDefined();
    expect(S3Service.createPresignedUploadUrl).not.toHaveBeenCalled();
  });
});

describe('POST /api/s3/upload', { tags: ['backend'] }, () => {
  const url = 'http://localhost/api/s3/upload';
  const key = 'user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000';

  it('confirms an uploaded object and returns success with no data', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
    } as never);
    vi.mocked(MessageService.confirmUploadedMediaMessage).mockResolvedValue({
      message: { id: 'msg-1', mediaObjectKey: key, type: 'image' } as never,
      conversation: { id: 'conv-1' } as never,
    });

    const response = await POST(
      new Request(url, {
        method: 'POST',
        body: JSON.stringify({
          wabaId: 'waba-1',
          convId: 'conv-1',
          key,
          caption: 'receipt',
        }),
      }),
      { params: Promise.resolve({}) } as never,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: 'success', data: null });
    expect(MessageService.confirmUploadedMediaMessage).toHaveBeenCalledWith({
      userId: 'user-1',
      wabaId: 'waba-1',
      convId: 'conv-1',
      key,
      caption: 'receipt',
    });
  });

  it('rejects invalid upload confirmation payloads', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
    } as never);

    const response = await POST(
      new Request(url, {
        method: 'POST',
        body: JSON.stringify({
          wabaId: 'waba-1',
          convId: 'conv-1',
          key: 'bad',
        }),
      }),
      { params: Promise.resolve({}) } as never,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.data.key).toBeDefined();
    expect(MessageService.confirmUploadedMediaMessage).not.toHaveBeenCalled();
  });

  it('returns service ApiError responses', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
    } as never);
    vi.mocked(MessageService.confirmUploadedMediaMessage).mockRejectedValue(
      new ApiError('Uploaded object not found', 404),
    );

    const response = await POST(
      new Request(url, {
        method: 'POST',
        body: JSON.stringify({ wabaId: 'waba-1', convId: 'conv-1', key }),
      }),
      { params: Promise.resolve({}) } as never,
    );

    expect(response.status).toBe(404);
  });
});
