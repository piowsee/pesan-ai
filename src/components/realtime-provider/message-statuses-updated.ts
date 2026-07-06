import { conversationKeys } from '@/hooks/use-conversations';
import { messageKeys } from '@/hooks/use-message';
import type { ChatConversation } from '@/types/chat';
import type { QueryClient } from '@tanstack/react-query';

import { refetchRealtimeCache } from './cache';
import type { MessagePageCache } from './types';

export interface MessageStatusUpdate {
  id: string;
  messageId: string;
  status: string;
  errorMessage: string | null;
  conversationId: string;
}

export interface MessageStatusesUpdatedPayload {
  wabaId: string;
  statuses: MessageStatusUpdate[];
}

export function applyMessageStatusUpdatesToMessagePage(
  page: MessagePageCache,
  statusUpdates: MessageStatusUpdate[],
): MessagePageCache {
  if (!statusUpdates.length) return page;

  const statusById = new Map(
    statusUpdates.map((statusUpdate) => [statusUpdate.id, statusUpdate]),
  );
  let hasUpdatedMessage = false;

  const messages = page.messages.map((message) => {
    const statusUpdate = statusById.get(message.id);
    if (!statusUpdate) return message;

    hasUpdatedMessage = true;
    return {
      ...message,
      status: statusUpdate.status,
      errorMessage: statusUpdate.errorMessage,
    };
  });

  return hasUpdatedMessage ? { ...page, messages } : page;
}

export function applyMessageStatusUpdatesToConversations(
  chats: ChatConversation[],
  statusUpdates: MessageStatusUpdate[],
): ChatConversation[] {
  if (!statusUpdates.length) return chats;

  const statusById = new Map(
    statusUpdates.map((statusUpdate) => [statusUpdate.id, statusUpdate]),
  );

  return chats.map((chat) => {
    const lastMessageId = chat.lastMessage?.id;
    const statusUpdate = lastMessageId
      ? statusById.get(lastMessageId)
      : undefined;

    if (!statusUpdate || !chat.lastMessage) return chat;

    return {
      ...chat,
      lastMessage: {
        ...chat.lastMessage,
        status: statusUpdate.status,
        errorMessage: statusUpdate.errorMessage,
      },
    };
  });
}

export function updateMessageStatusCaches({
  payload,
  queryClient,
}: {
  payload: MessageStatusesUpdatedPayload;
  queryClient: QueryClient;
}) {
  const statusUpdatesByConversation = groupMessageStatusUpdatesByConversation(
    payload.statuses,
  );

  statusUpdatesByConversation.forEach((statusUpdates, conversationId) => {
    let didUpdateCachedMessage = false;

    queryClient.setQueryData(
      messageKeys.all(conversationId),
      (old: { pages: MessagePageCache[] } | undefined) => {
        if (!old) return old;

        const pages = old.pages.map((page) => {
          const updatedPage = applyMessageStatusUpdatesToMessagePage(
            page,
            statusUpdates,
          );
          didUpdateCachedMessage ||= updatedPage !== page;
          return updatedPage;
        });

        return { ...old, pages };
      },
    );

    if (!didUpdateCachedMessage) {
      void refetchRealtimeCache(
        queryClient,
        messageKeys.all(conversationId),
        true,
      );
    }
  });

  queryClient.setQueryData(
    conversationKeys.all(payload.wabaId),
    (old: { chats: ChatConversation[]; total: number } | undefined) => {
      if (!old) return old;

      return {
        ...old,
        chats: applyMessageStatusUpdatesToConversations(
          old.chats,
          payload.statuses,
        ),
      };
    },
  );
}

function groupMessageStatusUpdatesByConversation(
  statusUpdates: MessageStatusUpdate[],
) {
  const groupedStatusUpdates = new Map<string, MessageStatusUpdate[]>();

  statusUpdates.forEach((statusUpdate) => {
    const conversationStatusUpdates =
      groupedStatusUpdates.get(statusUpdate.conversationId) ?? [];

    conversationStatusUpdates.push(statusUpdate);
    groupedStatusUpdates.set(
      statusUpdate.conversationId,
      conversationStatusUpdates,
    );
  });

  return groupedStatusUpdates;
}
