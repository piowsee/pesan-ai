import { logger } from '@/lib/logger';
import {
  SEND_MSG_TO_BOT_WEBHOOK_TASK,
  type SendMsgToBotWebhookTaskItem,
} from '@/lib/queue';
import { WebhookService } from '@/services/webhook.service';

function getBundledIncomingMessage(payload: SendMsgToBotWebhookTaskItem[]) {
  const validItems = payload.filter(
    (item) => item.conversationId && item.incomingMessage?.trim(),
  );

  if (validItems.length === 0) {
    return null;
  }

  const [firstItem] = validItems;

  if (!firstItem) {
    return null;
  }

  const bundledMessage = validItems
    .map((item) => item.incomingMessage.trim())
    .join('\n');

  return {
    conversationId: firstItem.conversationId,
    incomingMessage: bundledMessage,
  };
}

export default async function sendMsgToBotWebhook(
  payload: SendMsgToBotWebhookTaskItem[],
) {
  const bundledPayload = getBundledIncomingMessage(payload);

  if (!bundledPayload) {
    logger.warn('Skipping bot webhook task with empty payload', {
      taskIdentifier: SEND_MSG_TO_BOT_WEBHOOK_TASK,
    });
    return;
  }

  await WebhookService.processIncomingMessageBotReply(bundledPayload);
}
