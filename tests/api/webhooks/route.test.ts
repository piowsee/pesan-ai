import { GET, POST } from '@/app/api/webhooks/route';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { WebhookService } from '@/services/webhook.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Webhook API Routes (/api/webhooks)', { tags: ['backend'] }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    const url = 'http://localhost/api/webhooks';

    it('returns 200 and created webhook on success', async () => {
      vi.mocked(AuthHelper.requireAdmin).mockResolvedValue({
        id: 'admin-1',
      } as never);
      vi.mocked(WebhookService.validateWebhookUrl).mockResolvedValue(
        undefined as never,
      );
      vi.mocked(WebhookService.createWebhook).mockResolvedValue({
        id: 'wh-1',
      } as never);

      const req = new Request(url, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test',
          webhookUrl: 'http://test.com',
          passphrase: 'pass',
        }),
      });
      const response = await POST(req, {
        params: Promise.resolve({}),
      } as never);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.webhook).toEqual({ id: 'wh-1' });
      expect(WebhookService.validateWebhookUrl).toHaveBeenCalledWith(
        'http://test.com',
        'pass',
      );
      expect(WebhookService.createWebhook).toHaveBeenCalledWith('admin-1', {
        name: 'Test',
        webhookUrl: 'http://test.com',
        passphrase: 'pass',
      });
    });

    it('returns 400 on validation failure', async () => {
      vi.mocked(AuthHelper.requireAdmin).mockResolvedValue({
        id: 'admin-1',
      } as never);

      const req = new Request(url, {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }), // missing required fields
      });
      const response = await POST(req, {
        params: Promise.resolve({}),
      } as never);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.data.webhookUrl).toBeDefined();
    });

    it('returns 500 when unauthorized', async () => {
      vi.mocked(AuthHelper.requireAdmin).mockRejectedValueOnce(
        new Error('Unauthorized'),
      );

      const req1 = new Request(url, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test',
          webhookUrl: 'http://test.com',
          passphrase: 'pass',
        }),
      });
      const response1 = await POST(req1, {
        params: Promise.resolve({}),
      } as never);

      expect(response1.status).toBe(500);
    });
  });

  describe('GET', () => {
    it('returns paginated webhooks when no query params are provided', async () => {
      vi.mocked(AuthHelper.requireAdmin).mockResolvedValue({
        id: 'admin-1',
      } as never);
      vi.mocked(WebhookService.getWebhooksPaginated).mockResolvedValue({
        webhooks: [{ id: 'wh-1' }],
        total: 1,
      } as never);

      const req = new Request('http://localhost/api/webhooks');
      const response = await GET(req, { params: Promise.resolve({}) } as never);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.webhooks).toEqual([{ id: 'wh-1' }]);
      expect(data.data.page).toBe(1);
      expect(data.data.limit).toBe(10);
      expect(WebhookService.getWebhooksPaginated).toHaveBeenCalledWith(1, 10);
    });

    it('returns paginated webhooks when query params are provided', async () => {
      vi.mocked(AuthHelper.requireAdmin).mockResolvedValue({
        id: 'admin-1',
      } as never);
      vi.mocked(WebhookService.getWebhooksPaginated).mockResolvedValue({
        webhooks: [{ id: 'wh-1' }],
        total: 1,
      } as never);

      const req = new Request('http://localhost/api/webhooks?page=2&limit=5');
      const response = await GET(req, { params: Promise.resolve({}) } as never);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.webhooks).toEqual([{ id: 'wh-1' }]);
      expect(data.data.total).toBe(1);
      expect(data.data.page).toBe(2);
      expect(data.data.limit).toBe(5);
      expect(WebhookService.getWebhooksPaginated).toHaveBeenCalledWith(2, 5);
    });

    it('returns 500 when unauthorized', async () => {
      vi.mocked(AuthHelper.requireAdmin).mockRejectedValue(
        new Error('Unauthorized'),
      );

      const req = new Request('http://localhost/api/webhooks');
      const response = await GET(req, { params: Promise.resolve({}) } as never);

      expect(response.status).toBe(500);
    });
  });
});
