import { POST } from '@/app/api/embedded-signup/route';
import { ApiError } from '@/lib/api-helper/error';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { EmbeddedSignUpService } from '@/services/embedded-signup.service';
import { describe, expect, it, vi } from 'vitest';

describe('POST /api/embedded-signup', { tags: ['backend'] }, () => {
  const url = 'http://localhost/api/embedded-signup';

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
        event: 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
        sessionPayload: {
          waba_id: 'meta-waba-1',
          phone_number_id: 'meta-phone-1',
        },
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
    expect(EmbeddedSignUpService.completeEmbeddedSignup).toHaveBeenCalledWith({
      code: 'auth-code-123',
      event: 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
      wabaId: 'meta-waba-1',
      userId: 'user-1',
      phoneNumberId: 'meta-phone-1',
    });
  });

  it('returns 400 on validation failure', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
      role: 'user',
    } as never);

    const response = await POST(
      createRequest({
        code: '',
        sessionPayload: {
          waba_id: 'meta-waba-1',
          phone_number_id: 'meta-phone-1',
        },
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
        event: 'FINISH',
        sessionPayload: {
          waba_id: 'meta-waba-1',
          phone_number_id: 'meta-phone-1',
        },
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
        event: 'FINISH',
        sessionPayload: {
          waba_id: 'meta-waba-1',
          phone_number_id: 'meta-phone-1',
        },
      }),
      { params: Promise.resolve({}) } as never,
    );

    expect(response.status).toBe(500);
  });
});
