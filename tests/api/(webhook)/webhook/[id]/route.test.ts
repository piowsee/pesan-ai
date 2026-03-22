import { DELETE } from '@/app/api/(webhook)/webhook/[id]/route';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { WebhookService } from '@/services/webhook.service';
import { describe, expect, it, vi } from 'vitest';

describe('DELETE /api/webhook/:id', { tags: ['backend'] }, () => {
  const id = 'wh-123';
  const url = `http://localhost/api/webhook/${id}`;

  it('returns 200 on success', async () => {
    vi.mocked(AuthHelper.requireAdmin).mockResolvedValue({
      id: 'admin-1',
    } as never);
    vi.mocked(WebhookService.deleteWebhook).mockResolvedValue(
      undefined as never,
    );

    const req = new Request(url, { method: 'DELETE' });
    const response = await DELETE(req, {
      params: Promise.resolve({ id }),
    } as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.message).toBe('Webhook deleted successfully');
    expect(WebhookService.deleteWebhook).toHaveBeenCalledWith(id);
  });

  it('returns 500 when unauthorized', async () => {
    vi.mocked(AuthHelper.requireAdmin).mockRejectedValue(
      new Error('Unauthorized'),
    );

    const req = new Request(url, { method: 'DELETE' });
    const response = await DELETE(req, {
      params: Promise.resolve({ id }),
    } as never);

    expect(response.status).toBe(500);
  });
});
