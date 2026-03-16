import { logError, logger } from '@/logger/logger';
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
    // Meta expects a 200 OK response to acknowledge receipt of the event
    // The actual processing will be implemented later
    // TODO: add code for process incoming request
    const body = await req.json();
    logger.info('Received Meta Webhook Event', { body });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    logError(err, { service: 'meta-webhook', method: 'POST' });
    return NextResponse.json(
      { error: 'Failed to process event' },
      { status: 500 },
    );
  }
}
