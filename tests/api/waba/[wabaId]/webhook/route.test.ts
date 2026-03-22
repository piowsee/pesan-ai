import { PATCH } from '@/app/api/waba/[wabaId]/webhook/route';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { WabaService } from '@/services/waba.service';
import { describe, expect, it, vi } from 'vitest';

/**
 * API Route: PATCH /api/waba/[wabaId]/webhook
 * Reasoning: Tests HTTP route to ensure correct response codes, validation formatting,
 * and admin-only role access for webhook assignments.
 */

describe('PATCH /api/waba/[wabaId]/webhook', { tags: ['backend'] }, () => {
  const wabaId = 'waba-123';
  const url = `http://localhost/api/waba/${wabaId}/webhook`;

  const createRequest = (body: unknown) => {
    return new Request(url, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  };

  it('assigns webhook successfully', async () => {
    vi.mocked(AuthHelper.requireAdmin).mockResolvedValue({
      id: 'admin-1',
      role: 'admin',
    } as never);

    vi.mocked(WabaService.assignWebhookToWaba).mockResolvedValue({
      success: true,
    } as never);

    const req = createRequest({ webhookId: 'webhook-456' });
    const response = await PATCH(
      req as never,
      {
        params: Promise.resolve({ wabaId }),
      } as never,
    );

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('success');
    expect(data.data).toEqual({ success: true });
    expect(WabaService.assignWebhookToWaba).toHaveBeenCalledWith(
      wabaId,
      'webhook-456',
    );
  });

  it('unassigns webhook successfully with null', async () => {
    vi.mocked(AuthHelper.requireAdmin).mockResolvedValue({
      id: 'admin-1',
      role: 'admin',
    } as never);

    vi.mocked(WabaService.assignWebhookToWaba).mockResolvedValue({
      success: true,
    } as never);

    const req = createRequest({ webhookId: null });
    const response = await PATCH(
      req as never,
      {
        params: Promise.resolve({ wabaId }),
      } as never,
    );

    expect(response.status).toBe(200);
    expect(WabaService.assignWebhookToWaba).toHaveBeenCalledWith(wabaId, null);
  });

  it('returns 400 for invalid payload', async () => {
    vi.mocked(AuthHelper.requireAdmin).mockResolvedValue({
      id: 'admin-1',
      role: 'admin',
    } as never);

    const req = createRequest({ webhookId: 1234 }); // Expecting string or null
    const response = await PATCH(
      req as never,
      {
        params: Promise.resolve({ wabaId }),
      } as never,
    );

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.status).toBe('fail');
    expect(data.data.webhookId).toBeDefined();
    expect(WabaService.assignWebhookToWaba).not.toHaveBeenCalled();
  });

  it('returns 500 when unauthorized or failing', async () => {
    vi.mocked(AuthHelper.requireAdmin).mockRejectedValue(
      new Error('Unauthorized'),
    );

    const req = createRequest({ webhookId: 'webhook-456' });
    const response = await PATCH(
      req as never,
      {
        params: Promise.resolve({ wabaId }),
      } as never,
    );

    expect(response.status).toBe(500);
  });
});
