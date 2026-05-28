import { logger } from '@/lib/logger';
import { type WorkerUtils, makeWorkerUtils } from 'graphile-worker';

export const BOT_REPLY_BUNDLE_DELAY_MS = 15_000;
export const SEND_MSG_TO_BOT_WEBHOOK_TASK = 'send-msg-to-bot-webhook';

export type SendMsgToBotWebhookTaskItem = {
  conversationId: string;
  incomingMessage: string;
};

type EnqueueIncomingMessageResult =
  | { queued: false; reason: string }
  | { queued: true; debounceMs: number; queuedMessages: number };

let workerUtilsPromise: Promise<WorkerUtils> | null = null;

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to enqueue Graphile jobs');
  }

  return connectionString;
}

async function getWorkerUtils() {
  workerUtilsPromise ??= makeWorkerUtils({
    connectionString: getConnectionString(),
    schema: 'graphile_worker',
  });

  return workerUtilsPromise;
}

function getBotReplyQueueName(conversationId: string) {
  return `bot-reply:${conversationId}`;
}

function getBotReplyJobKey(conversationId: string) {
  return `bot-reply:${conversationId}`;
}

function getQueuedMessagesCount(payload: unknown) {
  if (!Array.isArray(payload)) {
    return 0;
  }

  return payload.length;
}

export async function queueIncomingMessageBotReply(params: {
  conversationId: string;
  incomingMessage: string | undefined;
}): Promise<EnqueueIncomingMessageResult> {
  const { conversationId, incomingMessage } = params;
  const trimmedMessage = incomingMessage?.trim();

  if (!trimmedMessage) {
    return { queued: false, reason: 'Empty message content' };
  }

  const workerUtils = await getWorkerUtils();
  const runAt = new Date(Date.now() + BOT_REPLY_BUNDLE_DELAY_MS);
  const payload: SendMsgToBotWebhookTaskItem[] = [
    {
      conversationId,
      incomingMessage: trimmedMessage,
    },
  ];

  const queuedJobResult = await workerUtils.withPgClient(async (pgClient) => {
    const result = await pgClient.query<{ payload: unknown }>(
      `
        select payload
        from graphile_worker.add_jobs(
          array[
            row(
              $1::text,
              $2::json,
              $3::text,
              $4::timestamptz,
              $5::integer,
              $6::text,
              $7::integer,
              $8::text[]
            )::graphile_worker.job_spec
          ],
          $9::boolean
        )
      `,
      [
        SEND_MSG_TO_BOT_WEBHOOK_TASK,
        JSON.stringify(payload),
        getBotReplyQueueName(conversationId),
        runAt.toISOString(),
        null,
        getBotReplyJobKey(conversationId),
        null,
        null,
        true,
      ],
    );

    return result.rows[0];
  });

  const queuedMessages = getQueuedMessagesCount(queuedJobResult?.payload);

  logger.info('Queued incoming message for bundled bot delivery', {
    conversationId,
    queuedMessages,
    debounceMs: BOT_REPLY_BUNDLE_DELAY_MS,
    taskIdentifier: SEND_MSG_TO_BOT_WEBHOOK_TASK,
  });

  return {
    queued: true,
    debounceMs: BOT_REPLY_BUNDLE_DELAY_MS,
    queuedMessages,
  };
}

export async function releaseQueueForTests() {
  if (!workerUtilsPromise) {
    return;
  }

  const workerUtils = await workerUtilsPromise;
  await workerUtils.release();
  workerUtilsPromise = null;
}
