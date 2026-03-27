import type { ChatStreamEvent } from '@/types/chat';
import { EventEmitter } from 'node:events';

declare global {
  var __chatEventBus: EventEmitter | undefined;
}

const chatEventBus = globalThis.__chatEventBus ?? new EventEmitter();
chatEventBus.setMaxListeners(0);

if (!globalThis.__chatEventBus) {
  globalThis.__chatEventBus = chatEventBus;
}

function getChatChannel(wabaId: string) {
  return `chat:${wabaId}`;
}

export function publishChatEvent(event: ChatStreamEvent) {
  chatEventBus.emit(getChatChannel(event.wabaId), event);
}

export function subscribeToChatEvents(
  wabaId: string,
  listener: (event: ChatStreamEvent) => void,
) {
  const channel = getChatChannel(wabaId);
  chatEventBus.on(channel, listener);

  return () => {
    chatEventBus.off(channel, listener);
  };
}
