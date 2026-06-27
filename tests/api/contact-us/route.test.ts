import { POST } from '@/app/api/contact-us/route';
import { ContactUsService } from '@/services/contact-us.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Contact Us API Route (/api/contact-us)', () => {
  const url = 'http://localhost/api/contact-us';
  const validBody = {
    name: 'Jane Owner',
    email: 'jane@example.com',
    companyName: 'Jane Studio',
    phoneNumber: '6281234567890',
    message: 'Need access for two operators.',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 on successful contact request submission', async () => {
    vi.mocked(ContactUsService.submitRequest).mockResolvedValue({
      message: 'Contact request submitted successfully',
    });

    const req = new Request(url, {
      method: 'POST',
      headers: { 'x-forwarded-for': '198.51.100.10' },
      body: JSON.stringify(validBody),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      status: 'success',
      data: {
        message: 'Contact request submitted successfully',
      },
    });
    expect(ContactUsService.submitRequest).toHaveBeenCalledWith({
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
      headers: { 'x-forwarded-for': '198.51.100.11' },
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
    expect(ContactUsService.submitRequest).not.toHaveBeenCalled();
  });

  it('returns 400 when phone number contains non-digit characters', async () => {
    const req = new Request(url, {
      method: 'POST',
      headers: { 'x-forwarded-for': '198.51.100.12' },
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
    expect(ContactUsService.submitRequest).not.toHaveBeenCalled();
  });

  it('limits each client IP to three requests per minute', async () => {
    vi.mocked(ContactUsService.submitRequest).mockResolvedValue({
      message: 'Contact request submitted successfully',
    });

    const createRequest = () =>
      new Request(url, {
        method: 'POST',
        headers: { 'x-forwarded-for': '198.51.100.20' },
        body: JSON.stringify(validBody),
      });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await POST(createRequest());
      expect(response.status).toBe(200);
    }

    const response = await POST(createRequest());
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeTruthy();
    expect(data).toEqual({
      status: 'fail',
      data: {
        message: 'Too many requests. Please try again in a minute.',
      },
    });
    expect(ContactUsService.submitRequest).toHaveBeenCalledTimes(3);
  });
});
