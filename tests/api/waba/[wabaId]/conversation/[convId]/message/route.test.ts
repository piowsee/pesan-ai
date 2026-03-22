import { POST } from '@/app/api/waba/[wabaId]/conversation/[convId]/message/route';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { ApiError } from '@/lib/error';
import { ChatService } from '@/services/chat.service';
import { describe, expect, it, vi } from 'vitest';

describe('POST /api/waba/:wabaId/conversation/:convId/message', () => {
  const wabaId = 'waba-123';
  const convId = 'conv-123';
  const url = `http://localhost/api/waba/${wabaId}/conversation/${convId}/message`;

  it('returns 200 and sent message on success', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
    } as never);
    vi.mocked(ChatService.sendAdminMessage).mockResolvedValue({
      id: 'msg-1',
      content: 'hello',
    } as never);

    const req = new Request(url, {
      method: 'POST',
      body: JSON.stringify({ message: 'hello', token: 'token-123' }),
    });
    const response = await POST(req, {
      params: Promise.resolve({ wabaId, convId }),
    } as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.message).toEqual({ id: 'msg-1', content: 'hello' });
    expect(ChatService.sendAdminMessage).toHaveBeenCalledWith(
      convId,
      'user-1',
      'hello',
      'token-123',
    );
  });

  it('returns 400 on validation failure', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
    } as never);

    const req = new Request(url, {
      method: 'POST',
      body: JSON.stringify({}), // missing message
    });
    const response = await POST(req, {
      params: Promise.resolve({ wabaId, convId }),
    } as never);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.data.message).toBeDefined(); // schema error for message
  });

  it('returns 404 when ChatService throws ApiError', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue({
      id: 'user-1',
    } as never);
    vi.mocked(ChatService.sendAdminMessage).mockRejectedValue(
      new ApiError('Chat not found or access denied', 404),
    );

    const req = new Request(url, {
      method: 'POST',
      body: JSON.stringify({ message: 'hello' }),
    });
    const response = await POST(req, {
      params: Promise.resolve({ wabaId, convId }),
    } as never);

    expect(response.status).toBe(404);
  });

  it('returns 500 when unauthorized', async () => {
    vi.mocked(AuthHelper.requireUser).mockRejectedValue(
      new Error('Unauthorized'),
    );

    const req = new Request(url, {
      method: 'POST',
      body: JSON.stringify({ message: 'hello' }),
    });
    const response = await POST(req, {
      params: Promise.resolve({ wabaId, convId }),
    } as never);

    expect(response.status).toBe(500);
  });
});
