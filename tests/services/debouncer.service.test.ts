import { ConversationRepository } from '@/repositories/conversation.repository';
import { MessageRepository } from '@/repositories/message.repository';
import { ConversationService } from '@/services/conversation.service';
import { DebouncerService } from '@/services/debouncer.service';
import { redirectMessageToExternalWebhook } from '@/services/redirect-message.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/services/debouncer.service');

async function flushDebouncedProcessing() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('handleDebounceIncomingMessage', { tags: ['backend'] }, () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-24T12:00:00.000Z'));
    vi.clearAllMocks();
    vi.mocked(
      MessageRepository.findConversationMessageHistory,
    ).mockResolvedValue([
      {
        sequence: 1,
        type: 'text',
        source: 'customer',
        direction: 'incoming',
        timestamp: new Date('2026-06-24T11:50:00.000Z'),
        content: 'previous message',
      },
      {
        sequence: 2,
        type: 'text',
        source: 'customer',
        direction: 'incoming',
        timestamp: new Date('2026-06-24T12:00:10.000Z'),
        content: 'latest message',
      },
    ]);
    vi.mocked(ConversationRepository.findConversationById).mockResolvedValue({
      id: 'conv-1',
      phoneNumber: {
        wabaId: 'waba-1',
        waba: { userId: 'user-1' },
      },
    } as never);
    vi.mocked(
      ConversationRepository.updateAdminTakeoverStatus,
    ).mockResolvedValue({
      id: 'conv-1',
      adminTakeover: true,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('resets the timer and sends persisted history after the debounce window', async () => {
    DebouncerService.handleDebounceIncomingMessage({
      conversationId: 'conv-1',
      userId: 'user-1',
      wabaId: 'waba-1',
    });

    await vi.advanceTimersByTimeAsync(10_000);
    DebouncerService.handleDebounceIncomingMessage({
      conversationId: 'conv-1',
      userId: 'user-1',
      wabaId: 'waba-1',
    });

    await vi.advanceTimersByTimeAsync(14_999);
    expect(redirectMessageToExternalWebhook).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await flushDebouncedProcessing();

    expect(redirectMessageToExternalWebhook).toHaveBeenCalledTimes(1);
    expect(redirectMessageToExternalWebhook).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      userId: 'user-1',
      wabaId: 'waba-1',
      messages: [
        {
          sequence: 1,
          source: 'customer',
          direction: 'incoming',
          timestamp: new Date('2026-06-24T11:50:00.000Z'),
          content: 'previous message',
        },
        {
          sequence: 2,
          source: 'customer',
          direction: 'incoming',
          timestamp: new Date('2026-06-24T12:00:10.000Z'),
          content: 'latest message',
        },
      ],
    });
    expect(
      MessageRepository.findConversationMessageHistory,
    ).toHaveBeenCalledOnce();
    expect(
      MessageRepository.findConversationMessageHistory,
    ).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      since: new Date('2026-06-24T11:00:25.000Z'),
      createdBeforeOrAt: new Date('2026-06-24T12:00:25.000Z'),
    });
  });

  it('enables admin takeover immediately when history contains non-text messages', async () => {
    vi.mocked(
      MessageRepository.findConversationMessageHistory,
    ).mockResolvedValue([
      {
        sequence: 1,
        type: 'text',
        source: 'customer',
        direction: 'incoming',
        timestamp: new Date('2026-06-24T11:50:00.000Z'),
        content: 'please check this',
      },
      {
        sequence: 2,
        type: 'image',
        source: 'customer',
        direction: 'incoming',
        timestamp: new Date('2026-06-24T12:00:10.000Z'),
        content: 'receipt',
      },
    ]);

    DebouncerService.handleDebounceIncomingMessage({
      conversationId: 'conv-1',
      userId: 'user-1',
      wabaId: 'waba-1',
    });

    await vi.advanceTimersByTimeAsync(15_000);
    await flushDebouncedProcessing();

    expect(redirectMessageToExternalWebhook).not.toHaveBeenCalled();
    expect(ConversationService.updateAdminTakeoverStatus).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      userId: 'user-1',
      wabaId: 'waba-1',
      adminTakeover: true,
    });
  });

  it('keeps separate debounce timers per conversation', async () => {
    vi.mocked(MessageRepository.findConversationMessageHistory)
      .mockResolvedValueOnce([
        {
          sequence: 1,
          type: 'text',
          source: 'customer',
          direction: 'incoming',
          timestamp: new Date('2026-06-24T11:50:00.000Z'),
          content: 'first history',
        },
      ])
      .mockResolvedValueOnce([
        {
          sequence: 1,
          type: 'text',
          source: 'customer',
          direction: 'incoming',
          timestamp: new Date('2026-06-24T11:51:00.000Z'),
          content: 'second history',
        },
      ]);
    DebouncerService.handleDebounceIncomingMessage({
      conversationId: 'conv-1',
      userId: 'user-1',
      wabaId: 'waba-1',
    });
    DebouncerService.handleDebounceIncomingMessage({
      conversationId: 'conv-2',
      userId: 'user-2',
      wabaId: 'waba-2',
    });

    await vi.advanceTimersByTimeAsync(15_000);
    await flushDebouncedProcessing();

    expect(redirectMessageToExternalWebhook).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      userId: 'user-1',
      wabaId: 'waba-1',
      messages: [
        {
          sequence: 1,
          source: 'customer',
          direction: 'incoming',
          timestamp: new Date('2026-06-24T11:50:00.000Z'),
          content: 'first history',
        },
      ],
    });
    expect(redirectMessageToExternalWebhook).toHaveBeenCalledWith({
      conversationId: 'conv-2',
      userId: 'user-2',
      wabaId: 'waba-2',
      messages: [
        {
          sequence: 1,
          source: 'customer',
          direction: 'incoming',
          timestamp: new Date('2026-06-24T11:51:00.000Z'),
          content: 'second history',
        },
      ],
    });
  });
});
