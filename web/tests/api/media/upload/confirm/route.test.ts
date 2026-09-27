import { POST } from '@/app/api/media/upload/confirm/route';
import { ApiError } from '@/lib/api-helper/error';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { MessageService } from '@/services/message.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/media/upload/confirm', { tags: ['backend'] }, () => {
  const url = 'http://localhost/api/media/upload/confirm';
  const key = 'user-1/waba-1/conv-1/550e8400-e29b-41d4-a716-446655440000';

  it('confirms an uploaded object and returns the saved media message', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
    } as never);
    vi.mocked(MessageService.confirmUploadedMediaMessages).mockResolvedValue([
      {
        message: {
          id: 'msg-1',
          mediaObjectKey: key,
          mediaFilename: 'receipt.png',
          type: 'image',
        } as never,
        conversation: { id: 'conv-1' } as never,
      },
    ]);

    const response = await POST(
      new Request(url, {
        method: 'POST',
        body: JSON.stringify({
          wabaId: 'waba-1',
          convId: 'conv-1',
          files: [
            {
              key,
              caption: 'receipt',
              filename: 'receipt.png',
            },
          ],
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
          message: {
            id: 'msg-1',
            mediaObjectKey: key,
            mediaFilename: 'receipt.png',
            type: 'image',
          },
          conversation: { id: 'conv-1' },
        },
      ],
    });
    expect(MessageService.confirmUploadedMediaMessages).toHaveBeenCalledWith({
      userId: 'user-1',
      wabaId: 'waba-1',
      convId: 'conv-1',
      files: [
        {
          key,
          caption: 'receipt',
          filename: 'receipt.png',
        },
      ],
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
          files: [{ key: 'bad' }],
        }),
      }),
      { params: Promise.resolve({}) } as never,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.data.files).toBeDefined();
    expect(MessageService.confirmUploadedMediaMessages).not.toHaveBeenCalled();
  });

  it('returns service ApiError responses', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
    } as never);
    vi.mocked(MessageService.confirmUploadedMediaMessages).mockRejectedValue(
      new ApiError('Uploaded object not found', 404),
    );

    const response = await POST(
      new Request(url, {
        method: 'POST',
        body: JSON.stringify({
          wabaId: 'waba-1',
          convId: 'conv-1',
          files: [{ key }],
        }),
      }),
      { params: Promise.resolve({}) } as never,
    );

    expect(response.status).toBe(404);
  });
});
