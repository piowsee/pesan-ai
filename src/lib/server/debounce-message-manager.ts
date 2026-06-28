// TODO: consider migrate to MQ/DB based queue worker
// NOTE: current implementation uses direct memory from nextjs instance.
import { logError, logger } from '@/lib/server/logger';
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
      const messages = await MessageRepository.findConversationTextHistory({
        conversationId,
        since: new Date(expiredAt.getTime() - BOT_HISTORY_WINDOW_MS),
        createdBeforeOrAt: expiredAt,
      });

      logger.info('Debounce window expired — forwarding message history', {
        conversationId,
        messageCount: messages.length,
      });

      try {
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
