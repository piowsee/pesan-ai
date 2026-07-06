'use client';

import { conversationKeys } from '@/hooks/use-conversations';
import { messageKeys } from '@/hooks/use-message';
import { useQueryClient } from '@tanstack/react-query';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  type BotWebhookFailedPayload,
  handleBotWebhookFailedEvent,
} from './bot-webhook-failed';
import { refetchRealtimeCache } from './cache';
import {
  type ConversationUpdatedPayload,
  handleConversationUpdatedEvent,
} from './conversation-updated';
import {
  type MessageStatusesUpdatedPayload,
  updateMessageStatusCaches,
} from './message-statuses-updated';
import { handleNewMessageEvent } from './new-message';
import type { RealtimeContextType, SSEMessagePayload } from './types';

export { applyBotWebhookFailureToConversations } from './bot-webhook-failed';
export { refetchRealtimeCache } from './cache';
export { applyConversationUpdateToConversations } from './conversation-updated';
export {
  applyMessageStatusUpdatesToConversations,
  applyMessageStatusUpdatesToMessagePage,
} from './message-statuses-updated';
export {
  applyRealtimeMessageToConversation,
  applyRealtimeMessageToMessagePage,
  isIncomingCustomerMessage,
} from './new-message';

const RealtimeContext = createContext<RealtimeContextType | null>(null);

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isActivated, setIsActivated] = useState(false);
  const viewingConversationIdRef = useRef<string | undefined>(undefined);
  const isPageVisibleRef = useRef(true);
  const markAsReadInFlightRef = useRef<Set<string>>(new Set());
  const pendingReadReceiptsRef = useRef<Map<string, string>>(new Map());

  const activate = useCallback(() => {
    setIsActivated(true);
  }, []);

  const markConversationAsRead = useCallback(
    async (wabaId: string, conversationId: string) => {
      const requestKey = `${wabaId}:${conversationId}`;

      if (markAsReadInFlightRef.current.has(requestKey)) {
        return;
      }

      markAsReadInFlightRef.current.add(requestKey);

      try {
        const response = await fetch(
          `/api/waba/${wabaId}/conversation/${conversationId}/read`,
          { method: 'PATCH', keepalive: true },
        );

        if (!response.ok) {
          console.error('Failed to mark active conversation as read', {
            wabaId,
            conversationId,
            status: response.status,
          });
        }
      } catch (error) {
        console.error('Failed to mark active conversation as read', error);
      } finally {
        markAsReadInFlightRef.current.delete(requestKey);
      }
    },
    [],
  );

  const flushPendingReadReceipts = useCallback(() => {
    const pendingEntries = Array.from(pendingReadReceiptsRef.current.entries());

    pendingReadReceiptsRef.current.clear();

    pendingEntries.forEach(([conversationId, wabaId]) => {
      void markConversationAsRead(wabaId, conversationId);
    });
  }, [markConversationAsRead]);

  const setViewingConversationId = useCallback(
    (id: string | undefined) => {
      const previousConversationId = viewingConversationIdRef.current;

      if (previousConversationId && previousConversationId !== id) {
        const previousWabaId = pendingReadReceiptsRef.current.get(
          previousConversationId,
        );

        if (previousWabaId) {
          pendingReadReceiptsRef.current.delete(previousConversationId);
          void markConversationAsRead(previousWabaId, previousConversationId);
        }
      }

      viewingConversationIdRef.current = id;
    },
    [markConversationAsRead],
  );

  const syncPageVisibility = useCallback(() => {
    const isVisible = document.visibilityState === 'visible';
    isPageVisibleRef.current = isVisible;

    if (!isVisible) {
      flushPendingReadReceipts();
    }
  }, [flushPendingReadReceipts]);

  useEffect(() => {
    syncPageVisibility();

    const handleVisibilityChange = () => {
      syncPageVisibility();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      flushPendingReadReceipts();
    };
  }, [flushPendingReadReceipts, syncPageVisibility]);

  useEffect(() => {
    if (!isActivated) return;

    // Connect to SSE endpoint once — auth is handled server-side.
    // This effect intentionally has NO dependency on viewingConversationId
    // so the connection is persistent as long as the provider is mounted.
    const eventSource = new EventSource('/api/sse');

    const handleOpen = () => {
      void refetchRealtimeCache(queryClient, conversationKeys.root);
      void refetchRealtimeCache(queryClient, messageKeys.root);
    };

    eventSource.addEventListener('open', handleOpen);

    eventSource.addEventListener('NEW_MESSAGE', (event: MessageEvent) => {
      try {
        const payload: SSEMessagePayload = JSON.parse(event.data);
        if (!payload) return;

        const isActive =
          isPageVisibleRef.current &&
          payload.conversationId === viewingConversationIdRef.current;

        handleNewMessageEvent({
          isActive,
          payload,
          queryClient,
          queueReadReceipt: (conversationId, wabaId) => {
            pendingReadReceiptsRef.current.set(conversationId, wabaId);
          },
        });
      } catch (err) {
        console.error('Failed to parse NEW_MESSAGE event:', err);
      }
    });

    eventSource.addEventListener(
      'BOT_WEBHOOK_FAILED',
      (event: MessageEvent) => {
        try {
          const payload: BotWebhookFailedPayload = JSON.parse(event.data);
          if (payload) handleBotWebhookFailedEvent({ payload, queryClient });
        } catch (err) {
          console.error('Failed to parse BOT_WEBHOOK_FAILED event:', err);
        }
      },
    );

    eventSource.addEventListener(
      'CONVERSATION_UPDATED',
      (event: MessageEvent) => {
        try {
          const payload: ConversationUpdatedPayload = JSON.parse(event.data);
          if (payload) handleConversationUpdatedEvent({ payload, queryClient });
        } catch (err) {
          console.error('Failed to parse CONVERSATION_UPDATED event:', err);
        }
      },
    );

    eventSource.addEventListener(
      'MESSAGE_STATUSES_UPDATED',
      (event: MessageEvent) => {
        try {
          const payload: MessageStatusesUpdatedPayload = JSON.parse(event.data);
          if (payload) updateMessageStatusCaches({ payload, queryClient });
        } catch (err) {
          console.error('Failed to parse MESSAGE_STATUSES_UPDATED event:', err);
        }
      },
    );

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
    };

    return () => {
      eventSource.removeEventListener('open', handleOpen);
      eventSource.close();
    };
  }, [queryClient, isActivated]);

  return (
    <RealtimeContext.Provider value={{ setViewingConversationId, activate }}>
      {children}
    </RealtimeContext.Provider>
  );
}
