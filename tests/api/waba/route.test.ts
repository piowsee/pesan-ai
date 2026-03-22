import { GET } from '@/app/api/waba/route';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { WabaService } from '@/services/waba.service';
import { describe, expect, it, vi } from 'vitest';

/**
 * API Route: GET /api/waba
 * Reasoning: Tests HTTP route to ensure correct response codes, JSend format,
 * pagination handling, and role-based logic (admin vs user).
 */

describe('GET /api/waba', { tags: ['backend'] }, () => {
  const createRequest = (url: string) => {
    return new Request(url);
  };

  it('returns unpaginated wabas for regular user', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
      role: 'user',
    } as never);
    vi.mocked(WabaService.getWabasByUserId).mockResolvedValue([
      { id: 'waba-1' },
    ] as never);

    const req = createRequest('http://localhost/api/waba');
    const response = await GET(req, { params: Promise.resolve({}) } as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('success');
    expect(data.data.wabas).toEqual([{ id: 'waba-1' }]);
    expect(WabaService.getWabasByUserId).toHaveBeenCalledWith('user-1');
  });

  it('returns unpaginated wabas for admin', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'admin-1',
      role: 'admin',
    } as never);
    vi.mocked(WabaService.getAllWabas).mockResolvedValue([
      { id: 'waba-admin' },
    ] as never);

    const req = createRequest('http://localhost/api/waba');
    const response = await GET(req, { params: Promise.resolve({}) } as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.wabas).toEqual([{ id: 'waba-admin' }]);
    expect(WabaService.getAllWabas).toHaveBeenCalledTimes(1);
  });

  it('handles pagination for regular user', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
      role: 'user',
    } as never);
    vi.mocked(WabaService.getWabasPaginated).mockResolvedValue({
      wabas: [{ id: 'waba-1' }],
      total: 1,
    } as never);

    const req = createRequest('http://localhost/api/waba?page=2&limit=5');
    const response = await GET(req, { params: Promise.resolve({}) } as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.wabas).toEqual([{ id: 'waba-1' }]);
    expect(data.data.page).toBe(2);
    expect(data.data.limit).toBe(5);
    expect(data.data.total).toBe(1);
    expect(WabaService.getWabasPaginated).toHaveBeenCalledWith({
      page: 2,
      limit: 5,
      userId: 'user-1',
    });
  });

  it('handles pagination for admin', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'admin-1',
      role: 'admin',
    } as never);
    vi.mocked(WabaService.getWabasPaginated).mockResolvedValue({
      wabas: [{ id: 'waba-admin' }],
      total: 5,
    } as never);

    const req = createRequest('http://localhost/api/waba?page=1&limit=10');
    const response = await GET(req, { params: Promise.resolve({}) } as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.wabas).toEqual([{ id: 'waba-admin' }]);
    expect(data.data.page).toBe(1);
    expect(data.data.limit).toBe(10);
    expect(data.data.total).toBe(5);
    expect(WabaService.getWabasPaginated).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      userId: undefined,
    });
  });

  it('returns 500 when unauthorized or failing', async () => {
    vi.mocked(AuthHelper.requireUser).mockRejectedValue(
      new Error('Unauthorized'),
    );

    const req = createRequest('http://localhost/api/waba');
    const response = await GET(req, { params: Promise.resolve({}) } as never);

    // api-handler catches generic errors and returns 500 by default unless ApiError
    expect(response.status).toBe(500);
  });
});
