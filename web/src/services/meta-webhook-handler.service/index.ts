import { logError, logger } from '@/lib/server/logger';
import {
  type MetaWebhookPayload,
  MetaWebhookPayloadSchema,
  type WebhookEntry,
} from '@/schemas/meta-webhook-handler.schema';
import crypto from 'crypto';

import { AccountUpdateWebhookHandler } from './account-update';
import { HistoryWebhookHandler } from './history';
import { MessagesWebhookHandler } from './messages';
import { SmbAppStateSyncWebhookHandler } from './smb-app-state-sync';
import { SmbMessageEchoesWebhookHandler } from './smb-message-echoes';

export const MetaWebhookHandlerService = {
  isValidSignature(rawBody: string, signatureHeader: string | null): boolean {
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
      logError(
        new Error('META_APP_SECRET is not defined in environment variables'),
      );
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
  },

  getUnprocessedWebhookResponse(result: { reason?: string }) {
    const isNotWaba = result.reason === 'Not a WABA event';
    const status = isNotWaba ? 404 : 200;
    const body = isNotWaba
      ? { error: result.reason }
      : { received: true, ...result };

    return { body, status };
  },

  async processMetaWebhookPayload(payload: unknown) {
    logger.info('Processing Meta Webhook payload');

    const parsedBody = validatePayload(payload);
    if (!parsedBody) {
      return { processed: false, reason: 'Invalid or ignored payload' };
    }

    const processedCount = await processEntries(parsedBody.entry || []);

    return { processed: true, count: processedCount };
  },
};

function validatePayload(payload: unknown): MetaWebhookPayload | null {
  const parsed = MetaWebhookPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    logger.warn('Invalid Meta Webhook payload structure', {
      errors: parsed.error.format(),
    });
    throw new Error('Invalid Webhook Payload');
  }

  const body = parsed.data;

  if (body.object !== 'whatsapp_business_account') {
    logger.info('Ignoring non-WABA webhook event', { object: body.object });
    return null;
  }

  return body;
}

async function processEntries(entries: WebhookEntry[]): Promise<number> {
  let processedCount = 0;

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      try {
        if (change.field === 'messages') {
          processedCount += await MessagesWebhookHandler.processChange(
            change.value,
          );
          continue;
        }

        if (change.field === 'smb_message_echoes') {
          processedCount += await SmbMessageEchoesWebhookHandler.processChange(
            change.value,
          );
          continue;
        }

        if (change.field === 'account_update') {
          processedCount += await AccountUpdateWebhookHandler.processChange({
            metaWabaId: entry.id,
            eventTime: entry.time,
            value: change.value,
          });
          continue;
        }

        if (change.field === 'smb_app_state_sync') {
          processedCount += await SmbAppStateSyncWebhookHandler.processChange({
            metaWabaId: entry.id,
            value: change.value,
          });
          continue;
        }

        if (change.field === 'history') {
          processedCount += await HistoryWebhookHandler.processChange({
            metaWabaId: entry.id,
            value: change.value,
          });
          continue;
        }
      } catch (error) {
        logError(error, {
          action: 'process_webhook_change',
          entryId: entry.id,
          field: change.field,
        });
      }
    }
  }

  return processedCount;
}
