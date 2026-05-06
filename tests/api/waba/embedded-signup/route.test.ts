import { POST } from '@/app/api/waba/embedded-signup/route';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { ApiError } from '@/lib/error';
import { EmbeddedSignUpService } from '@/services/embedded-signup.service';
import { describe, expect, it, vi } from 'vitest';

describe('POST /api/waba/embedded-signup', { tags: ['backend'] }, () => {
  const url = 'http://localhost/api/waba/embedded-signup';

  const createRequest = (body: unknown) =>
    new Request(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });

  it('returns 201 and signup result on success', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
      role: 'user',
    } as never);
    vi.mocked(EmbeddedSignUpService.completeEmbeddedSignup).mockResolvedValue({
      waba: {
        id: 'db-waba-1',
        wabaId: 'meta-waba-1',
      },
      phoneNumbers: [{ id: 'db-phone-1' }],
    } as never);

    const response = await POST(
      createRequest({
        code: 'auth-code-123',
        wabaId: 'meta-waba-1',
        sessionPayload: { step: 'finish' },
      }),
      { params: Promise.resolve({}) } as never,
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.status).toBe('success');
    expect(data.data).toEqual({
      wabaId: 'meta-waba-1',
      wabaDbId: 'db-waba-1',
      phoneNumbers: [{ id: 'db-phone-1' }],
    });
    expect(EmbeddedSignUpService.completeEmbeddedSignup).toHaveBeenCalledWith(
      'auth-code-123',
      'meta-waba-1',
      'user-1',
    );
  });

  it('returns 400 on validation failure', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
      role: 'user',
    } as never);

    const response = await POST(
      createRequest({
        code: '',
        wabaId: 'meta-waba-1',
      }),
      { params: Promise.resolve({}) } as never,
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.status).toBe('fail');
    expect(data.data.code).toBeDefined();
    expect(EmbeddedSignUpService.completeEmbeddedSignup).not.toHaveBeenCalled();
  });

  it('returns service ApiError status when embedded signup fails', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
      role: 'user',
    } as never);
    vi.mocked(EmbeddedSignUpService.completeEmbeddedSignup).mockRejectedValue(
      new ApiError('Meta temporarily unavailable', 503),
    );

    const response = await POST(
      createRequest({
        code: 'auth-code-123',
        wabaId: 'meta-waba-1',
      }),
      { params: Promise.resolve({}) } as never,
    );
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('fail');
    expect(data.data.message).toBe('Meta temporarily unavailable');
  });

  it('returns 500 when unauthorized', async () => {
    vi.mocked(AuthHelper.requireUser).mockRejectedValue(
      new Error('Unauthorized'),
    );

    const response = await POST(
      createRequest({
        code: 'auth-code-123',
        wabaId: 'meta-waba-1',
      }),
      { params: Promise.resolve({}) } as never,
    );

    expect(response.status).toBe(500);
  });
});
