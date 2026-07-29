import { ApiError } from '@/lib/api-helper/error';
import { decrypt, encrypt } from '@/lib/server/encryption';
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

  describe('updateWebhook', () => {
    const existingWebhook = {
      id: 'wh-1',
      name: 'Old Name',
      webhookUrl: 'https://old.example.com',
      passphrase: 'enc:encrypted-passphrase',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'user-1',
    };

    it('updates name and validates existing connection', async () => {
      vi.mocked(WebhookRepository.findById).mockResolvedValue(
        existingWebhook as never,
      );
      vi.mocked(decrypt).mockReturnValue('decrypted-passphrase');
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      vi.mocked(WebhookRepository.updateWebhook).mockResolvedValue({
        ...existingWebhook,
        name: 'New Name',
      } as never);

      const result = await WebhookService.updateWebhook({
        id: 'wh-1',
        data: { name: 'New Name' },
      });

      expect(result.name).toBe('New Name');
      expect(fetch).toHaveBeenCalledWith(
        'https://old.example.com',
        expect.objectContaining({ method: 'GET' }),
      );
      expect(WebhookRepository.updateWebhook).toHaveBeenCalledWith({
        id: 'wh-1',
        data: { name: 'New Name' },
      });
    });

    it('updates URL and validates new connection', async () => {
      vi.mocked(WebhookRepository.findById).mockResolvedValue(
        existingWebhook as never,
      );
      vi.mocked(decrypt).mockReturnValue('decrypted-passphrase');
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      vi.mocked(WebhookRepository.updateWebhook).mockResolvedValue({
        ...existingWebhook,
        webhookUrl: 'https://new.example.com',
      } as never);

      const result = await WebhookService.updateWebhook({
        id: 'wh-1',
        data: { webhookUrl: 'https://new.example.com' },
      });

      expect(result.webhookUrl).toBe('https://new.example.com');
      expect(fetch).toHaveBeenCalledWith(
        'https://new.example.com',
        expect.objectContaining({ method: 'GET' }),
      );
      expect(WebhookRepository.updateWebhook).toHaveBeenCalledWith({
        id: 'wh-1',
        data: { webhookUrl: 'https://new.example.com' },
      });
    });

    it('validates webhook URL and encrypts passphrase during update', async () => {
      vi.mocked(WebhookRepository.findById).mockResolvedValue(
        existingWebhook as never,
      );
      vi.mocked(decrypt).mockReturnValue('decrypted-passphrase');
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      vi.mocked(WebhookRepository.updateWebhook).mockResolvedValue({
        ...existingWebhook,
        webhookUrl: 'https://new.example.com',
      } as never);

      await WebhookService.updateWebhook({
        id: 'wh-1',
        data: {
          webhookUrl: 'https://new.example.com',
          passphrase: 'new-pass',
        },
      });

      // Should use the new values for validation
      expect(fetch).toHaveBeenCalledWith(
        'https://new.example.com',
        expect.objectContaining({ method: 'GET' }),
      );
      expect(encrypt).toHaveBeenCalledWith('new-pass');
    });

    it('uses existing URL and decrypted passphrase for validation if not provided', async () => {
      vi.mocked(WebhookRepository.findById).mockResolvedValue(
        existingWebhook as never,
      );
      vi.mocked(decrypt).mockReturnValue('decrypted-passphrase');
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      vi.mocked(WebhookRepository.updateWebhook).mockResolvedValue(
        existingWebhook as never,
      );

      await WebhookService.updateWebhook({
        id: 'wh-1',
        data: { name: 'Only Name Update' },
      });

      expect(decrypt).toHaveBeenCalledWith('enc:encrypted-passphrase');
      expect(fetch).toHaveBeenCalledWith(
        'https://old.example.com',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('throws 404 when webhook not found', async () => {
      vi.mocked(WebhookRepository.findById).mockResolvedValue(null);

      await expect(
        WebhookService.updateWebhook({
          id: 'non-existent',
          data: { name: 'Test' },
        }),
      ).rejects.toThrow(ApiError);

      await expect(
        WebhookService.updateWebhook({
          id: 'non-existent',
          data: { name: 'Test' },
        }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('refreshWebhookConnection', () => {
    const existingWebhook = {
      id: 'wh-1',
      name: 'Existing Webhook',
      webhookUrl: 'https://example.com/webhook',
      passphrase: 'enc:encrypted-passphrase',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'user-1',
    };

    it('successfully validates the existing connection', async () => {
      vi.mocked(WebhookRepository.findById).mockResolvedValue(
        existingWebhook as never,
      );
      vi.mocked(decrypt).mockReturnValue('decrypted-passphrase');
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      const result = await WebhookService.refreshWebhookConnection({
        id: 'wh-1',
      });

      expect(result.success).toBe(true);
      expect(decrypt).toHaveBeenCalledWith('enc:encrypted-passphrase');
      expect(fetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('throws 404 if webhook does not exist', async () => {
      vi.mocked(WebhookRepository.findById).mockResolvedValue(null);

      await expect(
        WebhookService.refreshWebhookConnection({ id: 'wh-missing' }),
      ).rejects.toThrow(ApiError);
    });
  });
});
