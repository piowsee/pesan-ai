'use client';

import {
  CHAT_BASE_HREF,
  getStoredChatHref,
  subscribeStoredChatState,
} from '@/components/chat/workspace/chat-route-state';
import { useSyncExternalStore } from 'react';

/**
 * Resolves the href a "Chat" nav entry should link to
 * if the user has a stored waba/conversation/params from a previous Chat visit,
 * link straight to it; otherwise fall back to the plain Chat base route.
 *
 * Starts at the base route (SSR-safe) and re-resolves from localStorage
 * whenever the stored Chat route changes.
 */
export function useChatNavHref() {
  return useSyncExternalStore(
    subscribeStoredChatState,
    getStoredChatHref,
    () => CHAT_BASE_HREF,
  );
}
