import eventBus, { SSE_EVENTS, getUserEvent } from '@/lib/chat/event-bus';
import { logError, logger } from '@/lib/server/logger';
import { MessageRepository } from '@/repositories/message.repository';
import type { WebhookStatus } from '@/schemas/meta-webhook-handler.schema/messages';

const SUPPORTED_MESSAGE_STATUSES = new Set([
  'sent',
  'delivered',
  'read',
  'failed',
]);

type MessageStatusUpdate = {
  messageId: string;
  status: string;
  errorMessage: string | null;
};

export const StatusMessageHandler = {
  processStatuses,
};

async function processStatuses(params: {
  statuses?: WebhookStatus[];
}): Promise<number> {
  const { statuses = [] } = params;
  const statusUpdates = getSupportedStatusUpdates(statuses);

  if (!statusUpdates.length) {
    return 0;
  }

  const updatedMessages =
    await MessageRepository.updateStatusesByMetaMessageIds(statusUpdates);

  emitMessageStatusesUpdatedEvents(updatedMessages);

  return updatedMessages.length;
}

function getSupportedStatusUpdates(
  statuses: WebhookStatus[],
): MessageStatusUpdate[] {
  const statusUpdates: MessageStatusUpdate[] = [];

  for (const status of statuses) {
    if (!SUPPORTED_MESSAGE_STATUSES.has(status.status)) {
      logger.info('Skipping unsupported WhatsApp message status', {
        messageId: status.id,
        status: status.status,
      });
      continue;
    }

    statusUpdates.push({
      messageId: status.id,
      status: status.status,
      errorMessage: getStatusErrorMessage(status),
    });
  }

  return statusUpdates;
}

function getStatusErrorMessage(status: WebhookStatus): string | null {
  if (status.status !== 'failed') {
    return null;
  }

  const firstError = status.errors?.[0];

  return (
    firstError?.error_data?.details ??
    firstError?.message ??
    firstError?.title ??
    null
  );
}

function emitMessageStatusesUpdatedEvents(
  updatedMessages: Awaited<
    ReturnType<typeof MessageRepository.updateStatusesByMetaMessageIds>
  >,
) {
  const updatesByUserAndWaba = new Map<
    string,
    {
      userId: string;
      wabaId: string;
      statuses: Array<{
        id: string;
        messageId: string;
        status: string;
        errorMessage: string | null;
        conversationId: string;
      }>;
    }
  >();

  for (const message of updatedMessages) {
    const key = `${message.userId}:${message.wabaId}`;
    const existing = updatesByUserAndWaba.get(key);
    const statusUpdate = {
      id: message.id,
      messageId: message.messageId,
      status: message.status,
      errorMessage: message.errorMessage,
      conversationId: message.conversationId,
    };

    if (existing) {
      existing.statuses.push(statusUpdate);
      continue;
    }

    updatesByUserAndWaba.set(key, {
      userId: message.userId,
      wabaId: message.wabaId,
      statuses: [statusUpdate],
    });
  }

  for (const payload of updatesByUserAndWaba.values()) {
    try {
      eventBus.emit(
        getUserEvent(SSE_EVENTS.MESSAGE_STATUSES_UPDATED, payload.userId),
        {
          wabaId: payload.wabaId,
          statuses: payload.statuses,
        },
      );
    } catch (error) {
      logError(error, {
        action: 'emit_message_statuses_updated_event',
        userId: payload.userId,
        wabaId: payload.wabaId,
      });
    }
  }
}
