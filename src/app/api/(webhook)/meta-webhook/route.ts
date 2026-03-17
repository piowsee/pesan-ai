import { logError, logger } from '@/logger/logger';
import { ChatService } from '@/services/chat.service';
import crypto from 'crypto';
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
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('x-hub-signature-256');

    if (!isValidSignature(rawBody, signatureHeader)) {
      logger.warn('Webhook signature validation failed');
      return NextResponse.json(
        { forbidden: 'Invalid signature' },
        { status: 403 },
      );
    }

    const body = JSON.parse(rawBody);
    logger.info('Received and Verified Meta Webhook Event', { body });

    const result = await ChatService.processMetaWebhookPayload(body);

    if (!result.processed) {
      return handleUnprocessedWebhook(result);
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

function isValidSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    logger.warn('Missing or invalid signature header format', {
      signatureHeader,
    });
    return false;
  }

  // NOTE: Meta uses the App Developer Secret for POST validation,
  // NOT the verify token used in the GET request.
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    logger.error('META_APP_SECRET is not defined in environment variables');
    return false;
  }

  const signature = signatureHeader.replace('sha256=', '');
  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  if (signature.length !== expectedSignature.length) {
    logger.warn('Signature length mismatch', {
      receivedLength: signature.length,
      expectedLength: expectedSignature.length,
    });
    return false;
  }

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex'),
  );

  if (!isValid) {
    logger.warn('Signature mismatch', {
      received: signature,
      expected: expectedSignature,
    });
  }

  return isValid;
}

function handleUnprocessedWebhook(result: { reason?: string }) {
  const isNotWaba = result.reason === 'Not a WABA event';
  const status = isNotWaba ? 404 : 200;
  const responseBody = isNotWaba
    ? { error: result.reason }
    : { received: true, ...result };

  return NextResponse.json(responseBody, { status });
}
