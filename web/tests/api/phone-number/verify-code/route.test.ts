import { POST } from '@/app/api/phone-number/verify-code/route';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { PhoneNumberService } from '@/services/phone-number.service';
import { describe, expect, it, vi } from 'vitest';

describe('POST /api/phone-number/verify-code', { tags: ['backend'] }, () => {
  const url = 'http://localhost/api/phone-number/verify-code';

  const createRequest = (body: unknown) =>
    new Request(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });

  it('returns 200 on success', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
      role: 'user',
    } as never);
    vi.mocked(PhoneNumberService.verifyAndRegister).mockResolvedValue({
      success: true,
    });

    const response = await POST(
      createRequest({
        phoneNumberId: 'phone-1',
        wabaId: 'waba-1',
        code: '123456',
      }),
      { params: Promise.resolve({}) } as never,
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('success');
    expect(data.data).toBeNull();
    expect(PhoneNumberService.verifyAndRegister).toHaveBeenCalledWith({
      phoneNumberId: 'phone-1',
      wabaId: 'waba-1',
      userId: 'user-1',
      code: '123456',
    });
  });

  it('returns 400 on validation failure', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
      role: 'user',
    } as never);

    const response = await POST(
      createRequest({
        phoneNumberId: 'phone-1',
        wabaId: 'waba-1',
        code: '12', // too short
      }),
      { params: Promise.resolve({}) } as never,
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.status).toBe('fail');
    expect(PhoneNumberService.verifyAndRegister).not.toHaveBeenCalled();
  });

  it('returns 500 when unauthorized', async () => {
    vi.mocked(AuthHelper.requireUser).mockRejectedValue(
      new Error('Unauthorized'),
    );

    const response = await POST(
      createRequest({
        phoneNumberId: 'phone-1',
        wabaId: 'waba-1',
        code: '123456',
      }),
      { params: Promise.resolve({}) } as never,
    );

    expect(response.status).toBe(500);
  });
});
