'use client';

import {
  type RawConversation,
  conversationKeys,
  mapRawConversationToChatConversation,
} from '@/hooks/use-conversations';
import { messageKeys } from '@/hooks/use-message';
import type { ChatConversation, ChatMessage } from '@/types/chat';
import { type InfiniteData, useQueryClient } from '@tanstack/react-query';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

interface RealtimeContextType {
  setViewingConversationId: (id: string | undefined) => void;
  activate: () => void;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}

interface SSEMessagePayload extends ChatMessage {
  wabaId: string;
  conversation: RawConversation;
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isActivated, setIsActivated] = useState(false);
  const viewingConversationIdRef = useRef<string | undefined>(undefined);

  const setViewingConversationId = (id: string | undefined) => {
    viewingConversationIdRef.current = id;
  };

  const activate = useCallback(() => {
    setIsActivated(true);
  }, []);

  useEffect(() => {
    if (!isActivated) return;

    // Connect to SSE endpoint once — auth is handled server-side.
    // This effect intentionally has NO dependency on viewingConversationId
    // so the connection is persistent as long as the provider is mounted.
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
  }, [queryClient, isActivated]);

  return (
    <RealtimeContext.Provider value={{ setViewingConversationId, activate }}>
      {children}
    </RealtimeContext.Provider>
  );
}
