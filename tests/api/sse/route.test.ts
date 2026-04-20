import { GET } from '@/app/api/sse/route';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import eventBus, { SSE_EVENTS, getUserEvent } from '@/lib/event-bus';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('SSE Route', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com', role: 'admin' };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AuthHelper.requireUser).mockResolvedValue(mockUser as never);
  });

  it('returns a 200 response with correct SSE headers', async () => {
    const req = new Request('http://localhost/api/sse');
    const response = await GET(req, { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.headers.get('Cache-Control')).toBe(
      'no-cache, no-transform',
    );
    expect(response.headers.get('Connection')).toBe('keep-alive');
  });

  it('subscribes to the correct user-specific event channel', async () => {
    const req = new Request('http://localhost/api/sse');
    await GET(req, { params: Promise.resolve({}) });

    const expectedEvent = getUserEvent(SSE_EVENTS.NEW_MESSAGE, mockUser.id);
    expect(eventBus.on).toHaveBeenCalledWith(
      expectedEvent,
      expect.any(Function),
    );
  });

  it('unsubscribes and clears heartbeat when connection is aborted', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const req = new Request('http://localhost/api/sse', {
      signal: controller.signal,
    });

    const response = await GET(req, { params: Promise.resolve({}) });

    // Ensure start() has run by starting a read
    const reader = response.body?.getReader();
    reader?.read();

    // Simulate abort
    controller.abort();

    vi.advanceTimersByTime(100);
    await Promise.resolve();

    const expectedEvent = getUserEvent(SSE_EVENTS.NEW_MESSAGE, mockUser.id);
    expect(eventBus.off).toHaveBeenCalledWith(
      expectedEvent,
      expect.any(Function),
    );

    // Cleanup
    await reader?.cancel();
    vi.useRealTimers();
  });

  it('correctly formats and sends events through the stream', async () => {
    const req = new Request('http://localhost/api/sse');
    const response = await GET(req, { params: Promise.resolve({}) });
    const reader = response.body?.getReader();

    const onNewMessage = vi.mocked(eventBus.on).mock.calls[0][1];
    const testPayload = { id: 'msg-1', content: 'hello' };

    // Start reading first
    const readPromise = reader!.read();

    // Now trigger the event that enqueues data
    onNewMessage(testPayload);

    const { value } = await readPromise;
    const decoded = new TextDecoder().decode(value);

    expect(decoded).toContain(`event: ${SSE_EVENTS.NEW_MESSAGE}`);
    expect(decoded).toContain(`data: ${JSON.stringify(testPayload)}`);

    await reader?.cancel();
  });
});
