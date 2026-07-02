// TODO: consider migrate to MQ/DB based queue worker
// NOTE: current implementation uses direct memory from nextjs instance.
import eventBus, { SSE_EVENTS, getUserEvent } from '@/lib/chat/event-bus';
import { logError, logger } from '@/lib/server/logger';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { MessageRepository } from '@/repositories/message.repository';
import { redirectMessageToExternalWebhook } from '@/services/redirect-message.service';

const timers = new Map<string, NodeJS.Timeout>();
const BOT_HISTORY_WINDOW_MS = 60 * 60 * 1000;

export function handleDebounceIncomingMessage(conversationId: string) {
  logger.info('Schedule conversation for bot webhook', {
    conversationId,
  });

  if (timers.has(conversationId)) {
    clearTimeout(timers.get(conversationId));
  }

  timers.set(
    conversationId,
    setTimeout(async () => {
      const expiredAt = new Date();
      timers.delete(conversationId);

      try {
        const messages = await MessageRepository.findConversationMessageHistory(
          {
            conversationId,
            since: new Date(expiredAt.getTime() - BOT_HISTORY_WINDOW_MS),
            createdBeforeOrAt: expiredAt,
          },
        );

        const hasNonTextMessage = messages.some(
          (message) => message.type !== 'text',
        );

        if (hasNonTextMessage) {
          await triggerAdminTakeoverForNonTextHistory({ conversationId });
          return;
        }

        logger.info('Debounce window expired — forwarding message history', {
          conversationId,
          messageCount: messages.length,
        });

        await redirectMessageToExternalWebhook({ conversationId, messages });
      } catch (error) {
        logError(error, {
          action: 'Unhandled bot webhook redirect failure',
          conversationId,
        });
      }
    }, 15_000),
  );
}

async function triggerAdminTakeoverForNonTextHistory(params: {
  conversationId: string;
}) {
  const { conversationId } = params;
  const conversation = await ConversationRepository.findConversationById({
    conversationId,
  });

  if (!conversation) {
    throw new Error(`Conversation ${conversationId} does not exist`);
  }

  await ConversationRepository.updateAdminTakeoverStatus({
    conversationId,
    adminTakeover: true,
  });

  logger.info('Non-text message detected — enabling admin takeover', {
    conversationId,
  });

  const userId = conversation.phoneNumber.waba.userId;
  // conversation.phoneNumber.wabaId is the internal DB WhatsappBusinessAccount.id.

  eventBus.emit(getUserEvent(SSE_EVENTS.CONVERSATION_UPDATED, userId), {
    conversationId,
    wabaId: conversation.phoneNumber.wabaId,
    adminTakeover: true,
  });
}
