import { ApiError } from '@/lib/error';
import { WhatsappService } from '@/services/whatsapp.service';
import { describe, expect, it, vi } from 'vitest';

vi.unmock('@/services/whatsapp.service');

/**
 * WhatsappService Tests
 * Reasoning: WhatsappService orchestrates the external HTTP call to Meta API.
 * We mock global fetch to verify correct payload formation without network calls.
 */

describe('WhatsappService', { tags: ['backend'] }, () => {
  describe('sendTextMessage', () => {
    it('sends message successfully and returns message info', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          messages: [{ id: 'wamid.123' }],
        }),
      });

      const result = await WhatsappService.sendTextMessage(
        'phone-123',
        'token-123',
        '+1234567890',
        'Hello from test',
      );

      expect(result.status).toBe('sent');
      expect(result.messageId).toBe('wamid.123');
      expect(fetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/phone-123/messages',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-123',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: '+1234567890',
            type: 'text',
            text: {
              preview_url: false,
              body: 'Hello from test',
            },
          }),
        }),
      );
    });

    it('throws ApiError when fetch fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Invalid payload' } }),
      });

      await expect(
        WhatsappService.sendTextMessage('phone-1', 'token-1', '+123', 'Hi'),
      ).rejects.toThrow(ApiError);
    });
  });
});
