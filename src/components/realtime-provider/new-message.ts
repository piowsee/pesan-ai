import {
  type RawConversation,
  conversationKeys,
  mapRawConversationToChatConversation,
} from '@/hooks/use-conversations';
import { messageKeys } from '@/hooks/use-message';
import { CHAT_FREEFORM_WINDOW_MS, isFreeformWindowOpen } from '@/lib/chat/chat';
import type { ChatConversation, ChatMessage } from '@/types/chat';
import type { QueryClient } from '@tanstack/react-query';

import {
  refetchRealtimeCache,
  updateRealtimeConversationListCache,
} from './cache';
import type { MessagePageCache, SSEMessagePayload } from './types';

export function isIncomingCustomerMessage(
  message: Pick<ChatMessage, 'direction' | 'source'>,
): boolean {
  return message.direction === 'incoming' && message.source === 'customer';
}

export function applyRealtimeMessageToConversation(params: {
  chat: ChatConversation;
  message: ChatMessage;
  adminTakeover: boolean;
  isActive: boolean;
}): ChatConversation {
  const { chat, message, adminTakeover, isActive } = params;
  const isCustomerMessage = isIncomingCustomerMessage(message);
  const isLatestMessage =
    !chat.lastMessageAt ||
    new Date(message.timestamp).getTime() >=
      new Date(chat.lastMessageAt).getTime();
  const isLatestCustomerMessage =
    isCustomerMessage &&
    (!chat.lastCustomerMessageAt ||
      new Date(message.timestamp).getTime() >=
        new Date(chat.lastCustomerMessageAt).getTime());
  const lastCustomerMessageAt = isLatestCustomerMessage
    ? message.timestamp
    : chat.lastCustomerMessageAt;

  return {
    ...chat,
    adminTakeover,
    lastMessage: isLatestMessage ? message : chat.lastMessage,
    lastMessageAt: isLatestMessage ? message.timestamp : chat.lastMessageAt,
    lastCustomerMessageAt,
    canSendFreeform: isFreeformWindowOpen(lastCustomerMessageAt),
    freeformWindowEndsAt: lastCustomerMessageAt
      ? new Date(
          new Date(lastCustomerMessageAt).getTime() + CHAT_FREEFORM_WINDOW_MS,
        ).toISOString()
      : null,
    unreadCount: isCustomerMessage
      ? isActive
        ? 0
        : chat.unreadCount + 1
      : chat.unreadCount,
    updatedAt: new Date().toISOString(),
  };
}

export function applyRealtimeMessageToMessagePage(
  page: MessagePageCache,
  realtimeMessage: ChatMessage,
): MessagePageCache {
  const existingMessageIndex = page.messages.findIndex(
    (message) => message.id === realtimeMessage.id,
  );

  if (existingMessageIndex !== -1) {
    return {
      ...page,
      messages: page.messages.map((message) =>
        message.id === realtimeMessage.id
          ? {
              ...realtimeMessage,
              optimisticId: message.optimisticId,
              ...(message.optimisticId
                ? {
                    timestamp: message.timestamp,
                    createdAt: message.createdAt,
                  }
                : {}),
            }
          : message,
      ),
    };
  }

  return {
    ...page,
    messages: [realtimeMessage, ...page.messages],
    total: page.total + 1,
  };
}

export function handleNewMessageEvent({
  isActive,
  payload,
  queryClient,
  queueReadReceipt,
}: {
  isActive: boolean;
  payload: SSEMessagePayload;
  queryClient: QueryClient;
  queueReadReceipt: (conversationId: string, wabaId: string) => void;
}) {
  const { wabaId, conversationId, conversation, ...newMessage } = payload;
  const realtimeMessage: ChatMessage = { ...newMessage, conversationId };

  const hasMessageCache =
    queryClient.getQueryData(messageKeys.all(conversationId)) !== undefined;
  const hasConversationCache =
    queryClient.getQueryData(conversationKeys.all(wabaId)) !== undefined;

  upsertRealtimeMessageInFirstPage({
    conversationId,
    message: realtimeMessage,
    queryClient,
  });

  if (!hasMessageCache) {
    void refetchRealtimeCache(
      queryClient,
      messageKeys.all(conversationId),
      true,
    );
  }

  updateConversationCacheForNewMessage({
    conversation,
    conversationId,
    isActive,
    queryClient,
    realtimeMessage,
    wabaId,
  });

  if (!hasConversationCache) {
    void refetchRealtimeCache(queryClient, conversationKeys.all(wabaId), true);
  }

  if (isActive && isIncomingCustomerMessage(realtimeMessage)) {
    queueReadReceipt(conversationId, wabaId);
  }
}

function upsertRealtimeMessageInFirstPage({
  conversationId,
  message,
  queryClient,
}: {
  conversationId: string;
  message: ChatMessage;
  queryClient: QueryClient;
}) {
  queryClient.setQueryData(
    messageKeys.all(conversationId),
    (old: { pages: MessagePageCache[] } | undefined) => {
      if (!old) return old;

      return {
        ...old,
        pages: old.pages.map((page, index) =>
          index === 0 ? applyRealtimeMessageToMessagePage(page, message) : page,
        ),
      };
    },
  );
}

function updateConversationCacheForNewMessage({
  conversation,
  conversationId,
  isActive,
  queryClient,
  realtimeMessage,
  wabaId,
}: {
  conversation: RawConversation;
  conversationId: string;
  isActive: boolean;
  queryClient: QueryClient;
  realtimeMessage: ChatMessage;
  wabaId: string;
}) {
  updateRealtimeConversationListCache({
    createChat: () =>
      mapRawConversationToChatConversation({
        ...conversation,
        messages: [realtimeMessage],
      }),
    queryClient,
    updateChat: (chat) =>
      chat.id === conversationId
        ? applyRealtimeMessageToConversation({
            chat,
            message: realtimeMessage,
            adminTakeover: conversation.adminTakeover,
            isActive,
          })
        : chat,
    wabaId,
  });
}
