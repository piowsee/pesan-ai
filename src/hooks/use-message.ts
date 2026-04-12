'use client';

import type { ChatConversation, ChatMessage } from '@/types/chat';
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  type RawConversation,
  conversationKeys,
  mapRawConversationToChatConversation,
} from './use-conversations';

// ─── Query Keys ──────────────────────────────────────────────────────

export const messageKeys = {
  all: (convId: string) => ['messages', convId] as const,
};

// ─── Types ───────────────────────────────────────────────────────────

export interface MessageGroup {
  date: string; // YYYY-MM-DD
  messages: ChatMessage[];
}

interface MessageFetchResponse {
  messages: ChatMessage[];
  total: number;
  page: number;
  limit: number;
}

// ─── API Functions ───────────────────────────────────────────────────

async function fetchMessages(
  wabaId: string,
  convId: string,
  page: number,
  limit = 50,
): Promise<MessageFetchResponse> {
  const response = await fetch(
    `/api/waba/${wabaId}/conversation/${convId}/message?page=${page}&limit=${limit}`,
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.data?.message ?? 'Failed to fetch messages';
    throw new Error(message);
  }

  const json = await response.json();
  return json.data;
}

// ─── Grouping Helper ───────────────────────────────────────────────

export function groupMessagesByDate(messages: ChatMessage[]): MessageGroup[] {
  if (!messages.length) return [];

  const groups: MessageGroup[] = [];
  const map: Record<string, ChatMessage[]> = {};

  // Note: messages from API are DESC (newest first).
  // We should sort them ASC (oldest first) before grouping for a timeline.
  const sorted = [...messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  sorted.forEach((msg) => {
    const date = new Date(msg.timestamp).toISOString().split('T')[0];
    if (!map[date]) {
      map[date] = [];
      groups.push({ date, messages: map[date] });
    }
    map[date].push(msg);
  });

  return groups;
}

// ─── Hook ────────────────────────────────────────────────────────────

/**
 * useMessages
 * Hook to fetch paginated chat messages for a specific conversation.
 * Supports infinite scroll (scroll up = load older).
 */
export function useMessages(
  wabaId: string | undefined,
  convId: string | undefined,
) {
  return useInfiniteQuery({
    queryKey: messageKeys.all(convId || ''),
    queryFn: ({ pageParam = 1 }) =>
      fetchMessages(wabaId!, convId!, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, total, limit } = lastPage;
      return page * limit < total ? page + 1 : undefined;
    },
    select: (data) => {
      // Flatten all pages into one array
      // Pages are in order [Page 1 (newest), Page 2, Page 3 (oldest)]
      const allMessages = data.pages.flatMap((page) => page.messages);

      // Group them by date
      return groupMessagesByDate(allMessages);
    },
    enabled: !!wabaId && !!convId,
    // Keep data fresh, let real-time updates (SSE) handle new messages
    staleTime: Infinity,
  });
}

// ─── Mutation Hook ──────────────────────────────────────────────────

interface SendMessageData {
  wabaId: string;
  convId: string;
  content: string;
}

/**
 * useSendMessage
 * Hook to send a text message to a WhatsApp customer within a conversation.
 * Manually updates the messages and conversations cache upon success for instant UI feedback.
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ wabaId, convId, content }: SendMessageData) => {
      const response = await fetch(
        `/api/waba/${wabaId}/conversation/${convId}/message`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: content }),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message = body?.data?.message ?? 'Failed to send message';
        throw new Error(message);
      }

      const json = await response.json();
      return json.data as {
        message: ChatMessage;
        conversation: RawConversation;
      };
    },
    onMutate: async ({ convId, content }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: messageKeys.all(convId) });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData<
        InfiniteData<MessageFetchResponse>
      >(messageKeys.all(convId));

      // Create an optimistic message
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticMessage: ChatMessage = {
        id: optimisticId,
        messageId: null,
        conversationId: convId,
        direction: 'outgoing',
        source: 'admin',
        type: 'text',
        content,
        mediaUrl: null,
        mediaMimeType: null,
        mediaFilename: null,
        mediaSize: null,
        status: 'sending',
        errorMessage: null,
        metadata: null,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      // Optimistically update to the new value
      queryClient.setQueryData<InfiniteData<MessageFetchResponse>>(
        messageKeys.all(convId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page, index) => {
              if (index === 0) {
                return {
                  ...page,
                  messages: [optimisticMessage, ...page.messages],
                  total: page.total + 1,
                };
              }
              return page;
            }),
          };
        },
      );

      return { previousMessages, optimisticId };
    },
    onError: (err, { convId }, context) => {
      // Show error toast
      toast.error(err.message || 'Failed to send message');

      // Instead of rolling back the entire list, just mark the optimistic message as failed
      if (context?.optimisticId) {
        queryClient.setQueryData<InfiniteData<MessageFetchResponse>>(
          messageKeys.all(convId),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                messages: page.messages.map((m) =>
                  m.id === context.optimisticId
                    ? { ...m, status: 'failed', errorMessage: err.message }
                    : m,
                ),
              })),
            };
          },
        );
      }
    },
    onSuccess: ({ message, conversation }, { wabaId, convId }, context) => {
      // 1. Update Messages Timeline Cache
      queryClient.setQueryData<InfiniteData<MessageFetchResponse>>(
        messageKeys.all(convId),
        (old) => {
          if (!old) return old;

          return {
            ...old,
            pages: old.pages.map((page, index) => {
              // Only modify the first page (newest messages)
              if (index !== 0) return page;

              // Filter out the optimistic message if it exists
              const filteredMessages = page.messages.filter(
                (m) => m.id !== context?.optimisticId,
              );

              // Check if the real message already exists (e.g. from SSE)
              const exists = filteredMessages.some((m) => m.id === message.id);

              if (exists) {
                return {
                  ...page,
                  messages: filteredMessages,
                  // total count: if we removed optimistic and real exists, total-1
                  total: page.total - 1,
                };
              }

              return {
                ...page,
                messages: [message, ...filteredMessages],
                // total count: if we replaced optimistic with real, total stays same as after onMutate
              };
            }),
          };
        },
      );

      // 2. Update Conversations Sidebar Cache
      queryClient.setQueryData<{ chats: ChatConversation[]; total: number }>(
        conversationKeys.all(wabaId),
        (old) => {
          if (!old) return old;

          let found = false;
          const updatedChats = old.chats.map((chat) => {
            if (chat.id === convId) {
              found = true;
              return {
                ...chat,
                lastMessage: message,
                lastMessageAt: message.timestamp,
                updatedAt: new Date().toISOString(),
              };
            }
            return chat;
          });

          if (!found) {
            const newChat = mapRawConversationToChatConversation({
              ...conversation,
              messages: [message],
            });

            return {
              ...old,
              chats: [newChat, ...old.chats],
              total: old.total + 1,
            };
          }

          const sortedChats = [...updatedChats].sort((a, b) => {
            const timeA = a.lastMessageAt
              ? new Date(a.lastMessageAt).getTime()
              : 0;
            const timeB = b.lastMessageAt
              ? new Date(b.lastMessageAt).getTime()
              : 0;
            return timeB - timeA;
          });

          return { ...old, chats: sortedChats };
        },
      );
    },
  });
}
