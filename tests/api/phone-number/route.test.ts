import { POST } from '@/app/api/phone-number/route';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { PhoneNumberService } from '@/services/phone-number.service';
import { describe, expect, it, vi } from 'vitest';

describe('POST /api/phone-number', { tags: ['backend'] }, () => {
  const url = 'http://localhost/api/phone-number';

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
    vi.mocked(PhoneNumberService.createPhoneNumber).mockResolvedValue({
      phoneNumberId: 'new-phone-id',
    });

    const response = await POST(
      createRequest({
        wabaId: 'waba-1',
        countryCode: '62',
        phoneNumber: '81234567890',
        name: 'New Bot',
      }),
      { params: Promise.resolve({}) } as never,
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('success');
    expect(data.data).toEqual({ phoneNumberId: 'new-phone-id' });
    expect(PhoneNumberService.createPhoneNumber).toHaveBeenCalledWith({
      wabaId: 'waba-1',
      userId: 'user-1',
      countryCode: '62',
      phoneNumber: '81234567890',
      name: 'New Bot',
    });
  });

  it('returns 400 on validation failure', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
      role: 'user',
    } as never);

    const response = await POST(
      createRequest({
        wabaId: 'waba-1',
      }),
      { params: Promise.resolve({}) } as never,
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.status).toBe('fail');
    expect(PhoneNumberService.createPhoneNumber).not.toHaveBeenCalled();
  });

  it('returns 500 when unauthorized', async () => {
    vi.mocked(AuthHelper.requireUser).mockRejectedValue(
      new Error('Unauthorized'),
    );

    const response = await POST(
      createRequest({
        wabaId: 'waba-1',
        countryCode: '62',
        phoneNumber: '81234567890',
        name: 'New Bot',
      }),
      { params: Promise.resolve({}) } as never,
    );

    expect(response.status).toBe(500);
  });
});
