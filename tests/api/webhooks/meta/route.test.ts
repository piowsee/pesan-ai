import { GET, POST } from '@/app/api/webhooks/meta/route';
import { MetaWebhookHandlerService } from '@/services/meta-webhook-handler.service';
import { describe, expect, it, vi } from 'vitest';

/**
 * API Route: GET & POST /api/webhooks/meta
 * Reasoning: Test the verification handshake of Meta Webhooks (GET) and
 * the payload signature validation (POST) ensuring our implementation is secure.
 */

describe('Meta Webhook Route', { tags: ['backend'] }, () => {
  describe('GET', () => {
    it('verifies webhook on correct token and mode', async () => {
      const req = new Request(
        'http://localhost/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=secret&hub.challenge=1234',
      );
      const response = await GET(req as never);

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('1234');
    });

    it('rejects verification on wrong token', async () => {
      const req = new Request(
        'http://localhost/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1234',
      );
      const response = await GET(req as never);

      expect(response.status).toBe(403);
    });
  });

  describe('POST', () => {
    const createReq = (body: string, signature: string) => {
      return new Request('http://localhost/api/webhooks/meta', {
        method: 'POST',
        headers: { 'x-hub-signature-256': `sha256=${signature}` },
        body,
      });
    };

    it('processes valid payload', async () => {
      const body = JSON.stringify({
        object: 'whatsapp_business_account',
        entry: [],
      });
      vi.mocked(MetaWebhookHandlerService.isValidSignature).mockReturnValue(
        true,
      );
      vi.mocked(
        MetaWebhookHandlerService.processMetaWebhookPayload,
      ).mockResolvedValue({
        processed: true,
        count: 2,
      });

      const req = createReq(body, 'valid-signature');
      const response = await POST(req as never);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(data.messagesProcessed).toBe(2);
    });

    it('rejects invalid signature', async () => {
      const body = JSON.stringify({ test: true });
      vi.mocked(MetaWebhookHandlerService.isValidSignature).mockReturnValue(
        false,
      );
      const req = createReq(body, 'invalid-signature');

      const response = await POST(req as never);

      expect(response.status).toBe(403);
      expect(
        MetaWebhookHandlerService.processMetaWebhookPayload,
      ).not.toHaveBeenCalled();
    });

    it('handles unprocessed webhook graceful exit', async () => {
      const body = JSON.stringify({ object: 'page', entry: [] });
      vi.mocked(MetaWebhookHandlerService.isValidSignature).mockReturnValue(
        true,
      );
      vi.mocked(
        MetaWebhookHandlerService.processMetaWebhookPayload,
      ).mockResolvedValue({
        processed: false,
        reason: 'Not a WABA event',
      });
      vi.mocked(
        MetaWebhookHandlerService.getUnprocessedWebhookResponse,
      ).mockReturnValue({
        body: { error: 'Not a WABA event' },
        status: 404,
      });

      const req = createReq(body, 'valid-signature');
      const response = await POST(req as never);

      expect(response.status).toBe(404);
    });
  });
});
