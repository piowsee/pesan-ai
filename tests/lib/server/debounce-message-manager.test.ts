import { handleDebounceIncomingMessage } from '@/lib/server/debounce-message-manager';
import { MessageRepository } from '@/repositories/message.repository';
import { redirectMessageToExternalWebhook } from '@/services/redirect-message.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/lib/server/debounce-message-manager');

describe('handleDebounceIncomingMessage', { tags: ['backend'] }, () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-24T12:00:00.000Z'));
    vi.clearAllMocks();
    vi.mocked(MessageRepository.findConversationTextHistory).mockResolvedValue([
      'previous message',
      'latest message',
    ]);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('resets the timer and sends persisted history after the debounce window', async () => {
    handleDebounceIncomingMessage('conv-1');

    await vi.advanceTimersByTimeAsync(10_000);
    handleDebounceIncomingMessage('conv-1');

    await vi.advanceTimersByTimeAsync(14_999);
    expect(redirectMessageToExternalWebhook).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(redirectMessageToExternalWebhook).toHaveBeenCalledTimes(1);
    expect(redirectMessageToExternalWebhook).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      messages: ['previous message', 'latest message'],
    });
    expect(
      MessageRepository.findConversationTextHistory,
    ).toHaveBeenCalledOnce();
    expect(MessageRepository.findConversationTextHistory).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      since: new Date('2026-06-24T11:00:25.000Z'),
    });
  });

  it('keeps separate debounce timers per conversation', async () => {
    vi.mocked(MessageRepository.findConversationTextHistory)
      .mockResolvedValueOnce(['first history'])
      .mockResolvedValueOnce(['second history']);
    handleDebounceIncomingMessage('conv-1');
    handleDebounceIncomingMessage('conv-2');

    await vi.advanceTimersByTimeAsync(15_000);

    expect(redirectMessageToExternalWebhook).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      messages: ['first history'],
    });
    expect(redirectMessageToExternalWebhook).toHaveBeenCalledWith({
      conversationId: 'conv-2',
      messages: ['second history'],
    });
  });
});
