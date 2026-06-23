import { POST } from '@/app/api/request-account/route';
import { RequestAccountService } from '@/services/request-account.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Request Account API Route (/api/request-account)', () => {
  const url = 'http://localhost/api/request-account';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 on successful account request submission', async () => {
    vi.mocked(RequestAccountService.sendRequest).mockResolvedValue({
      message: 'Account request submitted successfully',
    });

    const req = new Request(url, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Jane Owner',
        email: 'jane@example.com',
        companyName: 'Jane Studio',
        phoneNumber: '6281234567890',
        message: 'Need access for two operators.',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      status: 'success',
      data: {
        message: 'Account request submitted successfully',
      },
    });
    expect(RequestAccountService.sendRequest).toHaveBeenCalledWith({
      name: 'Jane Owner',
      email: 'jane@example.com',
      companyName: 'Jane Studio',
      phoneNumber: '6281234567890',
      message: 'Need access for two operators.',
    });
  });

  it('returns 400 when the request body is invalid', async () => {
    const req = new Request(url, {
      method: 'POST',
      body: JSON.stringify({
        name: '',
        email: 'not-an-email',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.status).toBe('fail');
    expect(data.data.name).toBeTruthy();
    expect(data.data.email).toBeTruthy();
    expect(RequestAccountService.sendRequest).not.toHaveBeenCalled();
  });

  it('returns 400 when phone number contains non-digit characters', async () => {
    const req = new Request(url, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Jane Owner',
        email: 'jane@example.com',
        phoneNumber: '+62 812 3456 7890',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.status).toBe('fail');
    expect(data.data.phoneNumber).toBeTruthy();
    expect(RequestAccountService.sendRequest).not.toHaveBeenCalled();
  });
});
