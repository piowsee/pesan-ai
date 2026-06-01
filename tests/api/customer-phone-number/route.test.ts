import { GET } from '@/app/api/customer-phone-number/route';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { PhoneNumberService } from '@/services/phone-number.service';
import { describe, expect, it, vi } from 'vitest';

describe('GET /api/customer-phone-number', { tags: ['backend'] }, () => {
  it('returns unpaginated customer phone numbers with filters', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
      role: 'user',
    } as never);
    vi.mocked(PhoneNumberService.getCustomerPhoneNumbers).mockResolvedValue({
      customerPhoneNumbers: [
        {
          customerPhone: '628111',
          customerName: 'Alice',
        },
      ],
      total: 1,
    });

    const req = new Request(
      'http://localhost/api/customer-phone-number?wabaId=waba-1&phoneNumber=%2B6281234567890',
    );
    const response = await GET(req, { params: Promise.resolve({}) } as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('success');
    expect(data.data.customerPhoneNumbers).toHaveLength(1);
    expect(data.data.total).toBe(1);
    expect(data.data.page).toBeUndefined();
    expect(data.data.limit).toBeUndefined();
    expect(PhoneNumberService.getCustomerPhoneNumbers).toHaveBeenCalledWith({
      userId: 'user-1',
      wabaId: 'waba-1',
      phoneNumber: '+6281234567890',
      page: undefined,
      limit: undefined,
    });
  });

  it('returns paginated customer phone numbers when pagination is requested', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
      role: 'user',
    } as never);
    vi.mocked(PhoneNumberService.getCustomerPhoneNumbers).mockResolvedValue({
      customerPhoneNumbers: [
        {
          customerPhone: '628111',
          customerName: 'Alice',
        },
      ],
      total: 3,
    });

    const req = new Request(
      'http://localhost/api/customer-phone-number?wabaId=waba-1&page=2&limit=5',
    );
    const response = await GET(req, { params: Promise.resolve({}) } as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.total).toBe(3);
    expect(data.data.page).toBe(2);
    expect(data.data.limit).toBe(5);
    expect(PhoneNumberService.getCustomerPhoneNumbers).toHaveBeenCalledWith({
      userId: 'user-1',
      wabaId: 'waba-1',
      phoneNumber: undefined,
      page: 2,
      limit: 5,
    });
  });

  it('returns 500 when unauthorized', async () => {
    vi.mocked(AuthHelper.requireUser).mockRejectedValue(
      new Error('Unauthorized'),
    );

    const req = new Request('http://localhost/api/customer-phone-number');
    const response = await GET(req, { params: Promise.resolve({}) } as never);

    expect(response.status).toBe(500);
  });
});
