'use client';

import type { ChatConversation, ChatMessage } from '@/types/chat';
import { type InfiniteData, useQueryClient } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useRef } from 'react';

import {
  type RawConversation,
  conversationKeys,
  mapRawConversationToChatConversation,
} from './use-conversations';
import { messageKeys } from './use-message';

interface UseChatSSEOptions {
  viewingConversationId?: string;
}

interface SSEMessagePayload extends ChatMessage {
  wabaId: string;
  conversation: RawConversation;
}

export function useChatSSE({ viewingConversationId }: UseChatSSEOptions) {
  const queryClient = useQueryClient();

  const viewingConversationIdRef = useRef(viewingConversationId);

  // Keep the ref in sync with the prop without restarting the SSE connection.
  // useLayoutEffect runs synchronously after every render, before any useEffect,
  // so the ref is always current before the SSE event handler reads it.
  useLayoutEffect(() => {
    viewingConversationIdRef.current = viewingConversationId;
  });

  useEffect(() => {
    // Connect to SSE endpoint once — auth is handled server-side.
    // This effect intentionally has NO dependency on viewingConversationId
    // so the connection is NOT torn down when the user switches conversations.
    const eventSource = new EventSource('/api/sse');

    const handleNewMessage = (payload: SSEMessagePayload) => {
      const { wabaId, conversationId, conversation, ...newMessage } = payload;

      // 1. Update Messages Timeline Cache
      queryClient.setQueryData(
        messageKeys.all(conversationId),
        (
          old:
            | InfiniteData<{
                messages: ChatMessage[];
                total: number;
                page: number;
                limit: number;
              }>
            | undefined,
        ) => {
          if (!old) return old;

          return {
            ...old,
            pages: old.pages.map((page, index) => {
              if (index === 0) {
                // Check if message already exists (e.g. added by useSendMessage)
                const exists = page.messages.some(
                  (m) => m.id === newMessage.id,
                );
                if (exists) return page;

                return {
                  ...page,
                  messages: [newMessage, ...page.messages],
                  total: page.total + 1,
                };
              }
              return page;
            }),
          };
        },
      );

      // 2. Update Conversations Sidebar Cache
      queryClient.setQueryData(
        conversationKeys.all(wabaId),
        (old: { chats: ChatConversation[]; total: number } | undefined) => {
          if (!old) return old;

          // Read which conversation the user is currently viewing — no stale closure.
          const isActive = conversationId === viewingConversationIdRef.current;
          let found = false;

          const updatedChats = old.chats.map((chat) => {
            if (chat.id === conversationId) {
              found = true;
              return {
                ...chat,
                lastMessage: newMessage,
                lastMessageAt: newMessage.timestamp,
                unreadCount: isActive ? chat.unreadCount : chat.unreadCount + 1,
                updatedAt: new Date().toISOString(),
              };
            }
            return chat;
          });

          if (!found) {
            // Instead of invalidating, construct and add the new conversation
            const newChat = mapRawConversationToChatConversation({
              ...conversation,
              messages: [{ ...newMessage, conversationId }],
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
    };

    eventSource.addEventListener('NEW_MESSAGE', (event: MessageEvent) => {
      try {
        const payload: SSEMessagePayload = JSON.parse(event.data);
        if (payload) handleNewMessage(payload);
      } catch (err) {
        console.error('Failed to parse NEW_MESSAGE event:', err);
      }
    });

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
    };

    return () => {
      eventSource.close();
    };
  }, [queryClient]);
}
