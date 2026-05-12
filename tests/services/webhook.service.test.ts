import { encrypt } from '@/lib/encryption';
import { ApiError } from '@/lib/error';
import { WebhookRepository } from '@/repositories/webhook.repository';
import { WebhookService } from '@/services/webhook.service';
import { describe, expect, it, vi } from 'vitest';

vi.unmock('@/services/webhook.service');

/**
 * WebhookService Tests
 * Reasoning: Test the external API fetching behavior, token generation for webhooks
 * and formatting responses.
 */

describe('WebhookService', { tags: ['backend'] }, () => {
  describe('callWebhook', () => {
    it('calls webhook successfully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const result = await WebhookService.callWebhook({
        url: 'https://example.com',
        passphrase: 'pass',
        method: 'GET',
      });
      expect(result.ok).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });

    it('throws ApiError on failed response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
      });

      await expect(
        WebhookService.callWebhook({
          url: 'https://example.com',
          passphrase: 'pass',
          method: 'POST',
          payload: {},
        }),
      ).rejects.toThrow(ApiError);
    });
  });

  describe('createWebhook', () => {
    it('creates and returns webhook mapping', async () => {
      vi.mocked(WebhookRepository.createWebhook).mockResolvedValue({
        id: 'wh-1',
        name: 'WH',
        webhookUrl: 'url',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user-1',
      } as never);

      const result = await WebhookService.createWebhook({
        userId: 'user-1',
        data: {
          name: 'WH',
          webhookUrl: 'url',
          passphrase: 'pass',
        },
      });

      expect(result.id).toBe('wh-1');
      expect(encrypt).toHaveBeenCalledWith('pass');
      expect(WebhookRepository.createWebhook).toHaveBeenCalled();
    });
  });
});
