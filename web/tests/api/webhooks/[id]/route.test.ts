import { DELETE, PATCH } from '@/app/api/webhooks/[id]/route';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { WebhookService } from '@/services/webhook.service';
import { describe, expect, it, vi } from 'vitest';

describe('DELETE /api/webhooks/:id', { tags: ['backend'] }, () => {
  const id = 'wh-123';
  const url = `http://localhost/api/webhooks/${id}`;

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
    expect(WebhookService.deleteWebhook).toHaveBeenCalledWith({ id });
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

describe('PATCH /api/webhooks/:id', { tags: ['backend'] }, () => {
  const id = 'wh-123';
  const url = `http://localhost/api/webhooks/${id}`;

  it('returns 200 when updating name only', async () => {
    vi.mocked(AuthHelper.requireAdmin).mockResolvedValue({
      id: 'admin-1',
    } as never);
    vi.mocked(WebhookService.updateWebhook).mockResolvedValue({
      id,
      name: 'Updated Name',
      webhookUrl: 'https://example.com/webhook',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'admin-1',
    } as never);

    const req = new Request(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Name' }),
    });
    const response = await PATCH(req, {
      params: Promise.resolve({ id }),
    } as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.webhook.name).toBe('Updated Name');
    expect(WebhookService.updateWebhook).toHaveBeenCalledWith({
      id,
      data: { name: 'Updated Name' },
    });
  });

  it('returns 400 when body is empty', async () => {
    vi.mocked(AuthHelper.requireAdmin).mockResolvedValue({
      id: 'admin-1',
    } as never);

    const req = new Request(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const response = await PATCH(req, {
      params: Promise.resolve({ id }),
    } as never);

    expect(response.status).toBe(400);
  });

  it('returns 500 when unauthorized', async () => {
    vi.mocked(AuthHelper.requireAdmin).mockRejectedValue(
      new Error('Unauthorized'),
    );

    const req = new Request(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    });
    const response = await PATCH(req, {
      params: Promise.resolve({ id }),
    } as never);

    expect(response.status).toBe(500);
  });
});
