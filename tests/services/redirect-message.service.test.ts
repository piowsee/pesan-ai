import { decrypt } from '@/lib/server/encryption';
import { logError } from '@/lib/server/logger';
import { WebhookRepository } from '@/repositories/webhook.repository';
import { redirectMessageToExternalWebhook } from '@/services/redirect-message.service';
import { betterFetch } from '@better-fetch/fetch';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import z from 'zod';

vi.unmock('@/services/redirect-message.service');
vi.mock('@better-fetch/fetch', () => ({
  betterFetch: vi.fn(),
}));

describe('redirectMessageToExternalWebhook', { tags: ['backend'] }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads active webhook data by conversation, decrypts the passphrase, and posts joined messages', async () => {
    vi.mocked(WebhookRepository.findWebhookByConversationId).mockResolvedValue({
      url: 'https://bot.example.com/message',
      passphrase: 'encrypted-passphrase',
      isActive: true,
    });
    vi.mocked(decrypt).mockReturnValue('plain-passphrase');
    vi.mocked(betterFetch).mockResolvedValue({
      data: { botResponse: 'ok' },
      error: null,
    } as never);

    const result = await redirectMessageToExternalWebhook({
      conversationId: 'conv-1',
      messages: ['hello', 'need help'],
    });

    expect(result).toEqual({ botResponse: 'ok' });
    expect(WebhookRepository.findWebhookByConversationId).toHaveBeenCalledWith({
      conversationId: 'conv-1',
    });
    expect(decrypt).toHaveBeenCalledWith('encrypted-passphrase');
    expect(betterFetch).toHaveBeenCalledWith(
      'https://bot.example.com/message',
      expect.objectContaining({
        method: 'POST',
        auth: { type: 'Bearer', token: 'plain-passphrase' },
        body: { message: 'hello.need help' },
      }),
    );
  });

  it('does not call the external webhook when the configured webhook is inactive', async () => {
    vi.mocked(WebhookRepository.findWebhookByConversationId).mockResolvedValue({
      url: 'https://bot.example.com/message',
      passphrase: 'encrypted-passphrase',
      isActive: false,
    });

    const result = await redirectMessageToExternalWebhook({
      conversationId: 'conv-1',
      messages: ['hello'],
    });

    expect(result).toBeUndefined();
    expect(betterFetch).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Webhook is inactive for conversation conv-1',
      }),
    );
  });

  it('returns undefined and logs when the webhook response schema is invalid', async () => {
    const schemaError = new z.ZodError([]);
    vi.mocked(WebhookRepository.findWebhookByConversationId).mockResolvedValue({
      url: 'https://bot.example.com/message',
      passphrase: 'encrypted-passphrase',
      isActive: true,
    });
    vi.mocked(betterFetch).mockResolvedValue({
      data: null,
      error: schemaError,
    } as never);

    const result = await redirectMessageToExternalWebhook({
      conversationId: 'conv-1',
      messages: ['hello'],
    });

    expect(result).toBeUndefined();
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Webhook response schema mismatch'),
      }),
    );
  });
});
