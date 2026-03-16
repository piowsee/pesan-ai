import { logError, logger } from '@/logger/logger';
import { ChatService } from '@/services/chat.service';
import { NextRequest, NextResponse } from 'next/server';

/**
 * @route GET /api/meta-webhook
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
 * @route POST /api/meta-webhook
 * @description Handle Meta Webhook event notifications.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    logger.info('Received Meta Webhook Event', { body });

    const result = await ChatService.processMetaWebhookPayload(body);

    if (!result.processed) {
      const isNotWaba = result.reason === 'Not a WABA event';
      const status = isNotWaba ? 404 : 200;
      const responseBody = isNotWaba
        ? { error: result.reason }
        : { received: true, ...result };

      return NextResponse.json(responseBody, { status });
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
