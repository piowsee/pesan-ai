import { logError, logger } from '@/lib/server/logger';
import { MetaWebhookHandlerService } from '@/services/meta-webhook-handler.service';
import { NextRequest, NextResponse } from 'next/server';

/**
 * @route GET /api/webhooks/meta
 * @description Handle Meta Webhook verification.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === process.env.META_WEBHOOK_SECRET) {
      logger.info('Webhook verified successfully');
      return new NextResponse(challenge, { status: 200 });
    }

    logger.warn('Webhook verification failed: invalid token or mode');
    return new NextResponse('Forbidden', { status: 403 });
  } catch (err) {
    logError(err, { service: 'meta-webhook', method: 'GET' });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * @route POST /api/webhooks/meta
 * @description Handle Meta Webhook event notifications.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('x-hub-signature-256');

    if (!MetaWebhookHandlerService.isValidSignature(rawBody, signatureHeader)) {
      logger.warn('Webhook signature validation failed');
      return NextResponse.json(
        { forbidden: 'Invalid signature' },
        { status: 403 },
      );
    }

    const body = JSON.parse(rawBody);
    logger.info('Received and Verified Meta Webhook Event', { body });

    const result =
      await MetaWebhookHandlerService.processMetaWebhookPayload(body);

    if (!result.processed) {
      const { body, status } =
        MetaWebhookHandlerService.getUnprocessedWebhookResponse(result);
      return NextResponse.json(body, { status });
    }

    return NextResponse.json(
      { received: true, messagesProcessed: result.count },
      { status: 200 },
    );
  } catch (err) {
    logError(err, { service: 'meta-webhook', method: 'POST' });
    return NextResponse.json(
      { error: 'Failed to process event' },
      { status: 500 },
    );
  }
}
