import { handleDebounceIncomingMessage } from '@/lib/server/debounce-message-manager';
import { redirectMessageToExternalWebhook } from '@/services/redirect-message.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/lib/server/debounce-message-manager');

describe('handleDebounceIncomingMessage', { tags: ['backend'] }, () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('buffers messages for the same conversation and redirects only after the debounce window', async () => {
    handleDebounceIncomingMessage('conv-1', 'hello');

    await vi.advanceTimersByTimeAsync(10_000);
    handleDebounceIncomingMessage('conv-1', 'are you there?');

    await vi.advanceTimersByTimeAsync(14_999);
    expect(redirectMessageToExternalWebhook).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(redirectMessageToExternalWebhook).toHaveBeenCalledTimes(1);
    expect(redirectMessageToExternalWebhook).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      messages: ['hello', 'are you there?'],
    });
  });

  it('keeps separate debounce buffers per conversation', async () => {
    handleDebounceIncomingMessage('conv-1', 'first');
    handleDebounceIncomingMessage('conv-2', 'second');

    await vi.advanceTimersByTimeAsync(15_000);

    expect(redirectMessageToExternalWebhook).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      messages: ['first'],
    });
    expect(redirectMessageToExternalWebhook).toHaveBeenCalledWith({
      conversationId: 'conv-2',
      messages: ['second'],
    });
  });
});
