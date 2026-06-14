// TODO: consider migrate to MQ/DB based queue worker
// NOTE: current implementation uses direct memory from nextjs instance.
import { redirectMessageToExternalWebhook } from '@/services/redirect-message.service';

const timers = new Map<string, NodeJS.Timeout>();
const buffers = new Map<string, string[]>();

export function handleDebounceIncomingMessage(
  conversationId: string,
  message: string,
) {
  if (!buffers.has(conversationId)) {
    buffers.set(conversationId, [message]);
  } else {
    buffers.get(conversationId)!.push(message);
  }

  if (timers.has(conversationId)) {
    clearTimeout(timers.get(conversationId));
  }

  timers.set(
    conversationId,
    setTimeout(async () => {
      const messages = buffers.get(conversationId) ?? [];
      buffers.delete(conversationId);
      timers.delete(conversationId);
      await redirectMessageToExternalWebhook({ conversationId, messages });
    }, 15_000),
  );
}
