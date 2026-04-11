'use client';

import type { ChatMessage } from '@/types/chat';
import { useInfiniteQuery } from '@tanstack/react-query';

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
