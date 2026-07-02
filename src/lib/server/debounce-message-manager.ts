// TODO: consider migrate to MQ/DB based queue worker
// NOTE: current implementation uses direct memory from nextjs instance.
import eventBus, { SSE_EVENTS, getUserEvent } from '@/lib/chat/event-bus';
import { logError, logger } from '@/lib/server/logger';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { MessageRepository } from '@/repositories/message.repository';
import { redirectMessageToExternalWebhook } from '@/services/redirect-message.service';

const timers = new Map<string, NodeJS.Timeout>();
const BOT_HISTORY_WINDOW_MS = 60 * 60 * 1000;

type BotMessageHistory = Awaited<
  ReturnType<typeof MessageRepository.findConversationMessageHistory>
>;
type RedirectableBotMessage = Omit<BotMessageHistory[number], 'type'>;

type DebouncedConversationContext = {
  conversationId: string;
  userId: string;
  wabaId: string;
};

export function handleDebounceIncomingMessage(
  params: DebouncedConversationContext,
) {
  const { conversationId } = params;

  logger.info('Schedule conversation for bot webhook', {
    conversationId,
  });

  if (timers.has(conversationId)) {
    clearTimeout(timers.get(conversationId));
  }

  timers.set(
    conversationId,
    setTimeout(
      (context: DebouncedConversationContext) => {
        // fire and forget
        void processDebouncedConversation(context);
      },
      15_000,
      params,
    ),
  );
}

async function processDebouncedConversation(
  params: DebouncedConversationContext,
) {
  const { conversationId, userId, wabaId } = params;
  const expiredAt = new Date();
  timers.delete(conversationId);

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
    // system will update conversation to AdminTakeover
    if (hasNonTextMessage) {
      await triggerAdminTakeoverForNonTextHistory({
        conversationId,
        userId,
        wabaId,
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

async function triggerAdminTakeoverForNonTextHistory(
  params: DebouncedConversationContext,
) {
  const { conversationId, userId, wabaId } = params;
  const conversation = await ConversationRepository.findConversationById({
    conversationId,
    userId,
    wabaId,
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

  eventBus.emit(getUserEvent(SSE_EVENTS.CONVERSATION_UPDATED, userId), {
    conversationId,
    wabaId,
    adminTakeover: true,
  });
}
