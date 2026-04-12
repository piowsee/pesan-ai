'use client';

import { useRealtime } from '@/components/realtime-provider';
import { useEffect } from 'react';

interface UseChatSSEOptions {
  viewingConversationId?: string;
}

/**
 * useChatSSE
 * This hook is now a simple "registration" hook.
 * It notifies the global RealtimeProvider which conversation (if any)
 * is currently being viewed by the user, so the persistent SSE listener
 * knows when to handle message delivery (e.g., incrementing unread counts).
 *
 * The actual SSE connection is managed globally by the RealtimeProvider.
 */
export function useChatSSE({ viewingConversationId }: UseChatSSEOptions) {
  const { setViewingConversationId, activate } = useRealtime();

  useEffect(() => {
    activate();
    setViewingConversationId(viewingConversationId);

    // Cleanup: when the component unmounts (or ID changes),
    // clear the viewing status in the global provider.
    return () => {
      setViewingConversationId(undefined);
    };
  }, [viewingConversationId, setViewingConversationId, activate]);
}
