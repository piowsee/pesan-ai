import { GET } from '@/app/api/waba/total-unread/route';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { WabaService } from '@/services/waba.service';
import { describe, expect, it, vi } from 'vitest';

/**
 * API Route: GET /api/waba/total-unread
 * Reasoning: Tests HTTP route to ensure correct response codes, JSend format,
 * and fetching unread counts for the authenticated user.
 */

describe('GET /api/waba/total-unread', { tags: ['backend'] }, () => {
  it('returns total unread counts for authenticated user', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
      role: 'user',
    } as never);

    vi.mocked(WabaService.getTotalUnreadListByUserId).mockResolvedValue([
      { id: 'waba-1', wabaId: 'meta-123', totalUnread: 5 },
    ] as never);

    const req = new Request('http://localhost/api/waba/total-unread');
    const response = await GET(
      req as never,
      { params: Promise.resolve({}) } as never,
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('success');
    expect(data.data.unreadCounts).toEqual([
      { id: 'waba-1', wabaId: 'meta-123', totalUnread: 5 },
    ]);
    expect(WabaService.getTotalUnreadListByUserId).toHaveBeenCalledWith({
      userId: 'user-1',
    });
  });

  it('returns 500 when unauthorized or failing', async () => {
    vi.mocked(AuthHelper.requireUser).mockRejectedValue(
      new Error('Unauthorized'),
    );

    const req = new Request('http://localhost/api/waba/total-unread');
    const response = await GET(
      req as never,
      { params: Promise.resolve({}) } as never,
    );

    expect(response.status).toBe(500);
  });
});
