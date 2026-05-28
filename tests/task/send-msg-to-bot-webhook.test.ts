import { WebhookService } from '@/services/webhook.service';
import sendMsgToBotWebhook from '@/worker/tasks/send-msg-to-bot-webhook';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('send-msg-to-bot-webhook task', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bundles queued messages before delegating to WebhookService', async () => {
    await sendMsgToBotWebhook([
      {
        conversationId: 'conv-1',
        incomingMessage: 'Hello',
      },
      {
        conversationId: 'conv-1',
        incomingMessage: 'Second message',
      },
    ]);

    expect(WebhookService.processIncomingMessageBotReply).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      incomingMessage: 'Hello\nSecond message',
    });
  });

  it('skips empty queued payloads', async () => {
    await sendMsgToBotWebhook([
      {
        conversationId: 'conv-1',
        incomingMessage: '   ',
      },
    ]);

    expect(
      WebhookService.processIncomingMessageBotReply,
    ).not.toHaveBeenCalled();
  });
});
