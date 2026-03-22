import { GET, POST } from '@/app/api/(webhook)/meta-webhook/route';
import { ChatService } from '@/services/chat.service';
import crypto from 'crypto';
import { describe, expect, it, vi } from 'vitest';

/**
 * API Route: GET & POST /api/meta-webhook
 * Reasoning: Test the verification handshake of Meta Webhooks (GET) and
 * the payload signature validation (POST) ensuring our implementation is secure.
 */

describe('Meta Webhook Route', () => {
  describe('GET', () => {
    it('verifies webhook on correct token and mode', async () => {
      const req = new Request(
        'http://localhost/api/meta-webhook?hub.mode=subscribe&hub.verify_token=secret&hub.challenge=1234',
      );
      const response = await GET(req as never);

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('1234');
    });

    it('rejects verification on wrong token', async () => {
      const req = new Request(
        'http://localhost/api/meta-webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1234',
      );
      const response = await GET(req as never);

      expect(response.status).toBe(403);
    });
  });

  describe('POST', () => {
    const createReq = (body: string, signature: string) => {
      return new Request('http://localhost/api/meta-webhook', {
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
      const signature = crypto
        .createHmac('sha256', 'app-secret')
        .update(body)
        .digest('hex');

      vi.mocked(ChatService.processMetaWebhookPayload).mockResolvedValue({
        processed: true,
        count: 2,
      });

      const req = createReq(body, signature);
      const response = await POST(req as never);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(data.messagesProcessed).toBe(2);
    });

    it('rejects invalid signature', async () => {
      const body = JSON.stringify({ test: true });
      const req = createReq(body, 'invalid-signature');

      const response = await POST(req as never);

      expect(response.status).toBe(403);
    });

    it('handles unprocessed webhook graceful exit', async () => {
      const body = JSON.stringify({ object: 'page', entry: [] });
      const signature = crypto
        .createHmac('sha256', 'app-secret')
        .update(body)
        .digest('hex');

      vi.mocked(ChatService.processMetaWebhookPayload).mockResolvedValue({
        processed: false,
        reason: 'Not a WABA event',
      });

      const req = createReq(body, signature);
      const response = await POST(req as never);

      expect(response.status).toBe(404);
    });
  });
});
