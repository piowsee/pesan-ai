import { POST } from '@/app/api/webhooks/[id]/refresh/route';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { WebhookService } from '@/services/webhook.service';
import { describe, expect, it, vi } from 'vitest';

describe('POST /api/webhooks/:id/refresh', { tags: ['backend'] }, () => {
  const id = 'wh-123';
  const url = `http://localhost/api/webhooks/${id}/refresh`;

  it('returns 200 on success', async () => {
    vi.mocked(AuthHelper.requireAdmin).mockResolvedValue({
      id: 'admin-1',
    } as never);
    vi.mocked(WebhookService.refreshWebhookConnection).mockResolvedValue({
      success: true,
    } as never);

    const req = new Request(url, { method: 'POST' });
    const response = await POST(req, {
      params: Promise.resolve({ id }),
    } as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.message).toBe('Connection verified successfully');
    expect(WebhookService.refreshWebhookConnection).toHaveBeenCalledWith({
      id,
    });
  });

  it('returns 500 when unauthorized', async () => {
    vi.mocked(AuthHelper.requireAdmin).mockRejectedValue(
      new Error('Unauthorized'),
    );

    const req = new Request(url, { method: 'POST' });
    const response = await POST(req, {
      params: Promise.resolve({ id }),
    } as never);

    expect(response.status).toBe(500);
  });
});
