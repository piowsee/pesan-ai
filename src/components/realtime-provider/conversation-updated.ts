import { conversationKeys } from '@/hooks/use-conversations';
import type { ChatConversation } from '@/types/chat';
import type { QueryClient } from '@tanstack/react-query';

import { refetchRealtimeCache } from './cache';

export interface ConversationUpdatedPayload {
  conversationId: string;
  wabaId: string;
  adminTakeover: boolean;
}

export function applyConversationUpdateToConversations(
  chats: ChatConversation[],
  payload: ConversationUpdatedPayload,
): ChatConversation[] {
  return chats.map((chat) =>
    chat.id === payload.conversationId
      ? { ...chat, adminTakeover: payload.adminTakeover }
      : chat,
  );
}

export function handleConversationUpdatedEvent({
  payload,
  queryClient,
}: {
  payload: ConversationUpdatedPayload;
  queryClient: QueryClient;
}) {
  const cachedConversations = queryClient.getQueryData<{
    chats: ChatConversation[];
    total: number;
  }>(conversationKeys.all(payload.wabaId));
  const hasConversation = cachedConversations?.chats.some(
    (chat) => chat.id === payload.conversationId,
  );

  if (!hasConversation) {
    void refetchRealtimeCache(
      queryClient,
      conversationKeys.all(payload.wabaId),
      true,
    );
    return;
  }

  queryClient.setQueryData(
    conversationKeys.all(payload.wabaId),
    (old: { chats: ChatConversation[]; total: number } | undefined) => {
      if (!old) return old;

      return {
        ...old,
        chats: applyConversationUpdateToConversations(old.chats, payload),
      };
    },
  );
}
