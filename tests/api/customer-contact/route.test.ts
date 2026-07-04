import { GET } from '@/app/api/customer-contact/route';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { CustomerContactService } from '@/services/customer-contact.service';
import { describe, expect, it, vi } from 'vitest';

describe('GET /api/customer-contact', { tags: ['backend'] }, () => {
  it('returns unpaginated customer phone numbers with multi-value filters', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
      role: 'user',
    } as never);
    vi.mocked(CustomerContactService.getCustomerContacts).mockResolvedValue({
      customerContacts: [
        {
          customerUsername: null,
          customerPhone: '628111',
          customerName: 'Alice',
        },
      ],
      total: 1,
    });

    const req = new Request(
      'http://localhost/api/customer-contact?wabaId=waba-1&wabaId=waba-2&phoneNumber=%2B6281234567890&phoneNumber=%2B6289876543210',
    );
    const response = await GET(req, { params: Promise.resolve({}) } as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('success');
    expect(data.data.customerContacts).toHaveLength(1);
    expect(data.data.total).toBe(1);
    expect(data.data.page).toBeUndefined();
    expect(data.data.limit).toBeUndefined();
    expect(CustomerContactService.getCustomerContacts).toHaveBeenCalledWith({
      userId: 'user-1',
      wabaIds: ['waba-1', 'waba-2'],
      phoneNumbers: ['+6281234567890', '+6289876543210'],
      page: undefined,
      limit: undefined,
    });
  });

  it('returns paginated customer phone numbers when pagination is requested', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
      role: 'user',
    } as never);
    vi.mocked(CustomerContactService.getCustomerContacts).mockResolvedValue({
      customerContacts: [
        {
          customerUsername: null,
          customerPhone: '628111',
          customerName: 'Alice',
        },
      ],
      total: 3,
    });

    const req = new Request(
      'http://localhost/api/customer-contact?wabaId=waba-1&page=2&limit=5',
    );
    const response = await GET(req, { params: Promise.resolve({}) } as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.total).toBe(3);
    expect(data.data.page).toBe(2);
    expect(data.data.limit).toBe(5);
    expect(CustomerContactService.getCustomerContacts).toHaveBeenCalledWith({
      userId: 'user-1',
      wabaIds: ['waba-1'],
      phoneNumbers: undefined,
      page: 2,
      limit: 5,
    });
  });

  it('returns 500 when unauthorized', async () => {
    vi.mocked(AuthHelper.requireUser).mockRejectedValue(
      new Error('Unauthorized'),
    );

    const req = new Request('http://localhost/api/customer-contact');
    const response = await GET(req, { params: Promise.resolve({}) } as never);

    expect(response.status).toBe(500);
  });
});
