// TODO: consider migrate to MQ/DB based queue worker
// NOTE: current implementation uses direct memory from nextjs instance.
//       if the server crashes or restarts, it might lose the context.
import { logError, logger } from '@/lib/server/logger';
import { MessageRepository } from '@/repositories/message.repository';
import { ConversationService } from '@/services/conversation.service';
import { redirectMessageToExternalWebhook } from '@/services/redirect-message.service';

// Timer for incoming message
const incoming_message_timers = new Map<string, NodeJS.Timeout>();
const REDIRECT_INCOMING_MESSAGE_TIMEOUT_MS = 15 * 1000; // 15 seconds

const BOT_HISTORY_WINDOW_MS = 60 * 60 * 1000; // 1 hour

type BotMessageHistory = Awaited<
  ReturnType<typeof MessageRepository.findConversationMessageHistory>
>;
type RedirectableBotMessage = Omit<BotMessageHistory[number], 'type'>;

type DebouncerContext = {
  conversationId: string;
  userId: string;
  wabaId: string;
};

export const DebouncerService = {
  handleDebounceIncomingMessage(params: DebouncerContext) {
    const { conversationId } = params;

    logger.info('Schedule conversation for bot webhook', {
      conversationId,
    });

    if (incoming_message_timers.has(conversationId)) {
      clearTimeout(incoming_message_timers.get(conversationId));
    }

    incoming_message_timers.set(
      conversationId,
      setTimeout(
        (context: DebouncerContext) => {
          incoming_message_timers.delete(context.conversationId);
          // fire and forget
          void processDebouncedIncomingMessage(context);
        },
        REDIRECT_INCOMING_MESSAGE_TIMEOUT_MS,
        params,
      ),
    );
  },
};

// Helper for Debounce Incoming Message
// -------------------------------------
async function processDebouncedIncomingMessage(params: DebouncerContext) {
  const { conversationId, userId, wabaId } = params;
  const expiredAt = new Date();

  try {
    const messages = await MessageRepository.findConversationMessageHistory({
      conversationId,
      since: new Date(expiredAt.getTime() - BOT_HISTORY_WINDOW_MS),
      createdBeforeOrAt: expiredAt,
    });

    const hasNonTextMessage = messages.some(
      (message) => message.type !== 'text',
    );

    // if history has message type other than text
    // system will update conversation to AdminTakeover True
    if (hasNonTextMessage) {
      await ConversationService.updateAdminTakeoverStatus({
        conversationId,
        userId,
        wabaId,
        adminTakeover: true,
      });
      return;
    }

    logger.info('Debounce window expired — forwarding message history', {
      conversationId,
      messageCount: messages.length,
    });

    await redirectMessageToExternalWebhook({
      conversationId,
      userId,
      wabaId,
      messages: removeMessageTypes(messages),
    });
  } catch (error) {
    logError(error, {
      action: 'Unhandled bot webhook redirect failure',
      conversationId,
    });
  }
}

function removeMessageTypes(
  messages: BotMessageHistory,
): RedirectableBotMessage[] {
  return messages.map(
    ({ sequence, source, direction, timestamp, content }) => ({
      sequence,
      source,
      direction,
      timestamp,
      content,
    }),
  );
}
