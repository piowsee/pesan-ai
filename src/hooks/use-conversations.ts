'use client';

import type { ChatConversation } from '@/types/chat';
import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';

// ─── Query Keys ──────────────────────────────────────────────────────

export const conversationKeys = {
  all: (wabaId: string) => ['conversations', wabaId] as const,
};

// ─── Types ───────────────────────────────────────────────────────────

interface RawConversation {
  id: string;
  customerPhone: string;
  customerName: string | null;
  adminTakeover: boolean;
  lastMessageAt: string | null;
  lastCustomerMessageAt: string | null;
  unreadCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  canSendFreeform: boolean;
  freeformWindowEndsAt: string | null;
  phoneNumber?: {
    id: string;
    displayPhoneNumber: string;
  } | null;
  messages?: Array<{
    id: string;
    messageId: string | null;
    conversationId: string;
    direction: 'incoming' | 'outgoing';
    source: 'customer' | 'admin' | 'bot';
    type: string;
    content: string | null;
    mediaUrl: string | null;
    mediaMimeType: string | null;
    mediaFilename: string | null;
    mediaSize: number | string | null;
    status: string;
    errorMessage: string | null;
    metadata: string | null;
    timestamp: string;
    createdAt: string;
  }> | null;
}

// ─── API Functions ───────────────────────────────────────────────────

// we use our own wabaId not the meta wabaId
async function fetchAllConversations(
  wabaId: string,
): Promise<{ chats: ChatConversation[]; total: number }> {
  const response = await fetch(`/api/waba/${wabaId}/conversation`);

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.data?.message ?? 'Failed to fetch conversations';
    throw new Error(message);
  }

  const json = await response.json();
  const rawChats: RawConversation[] = json.data?.chats ?? [];

  const chats: ChatConversation[] = rawChats.map((chat) => ({
    id: chat.id,
    customerPhone: chat.customerPhone,
    customerName: chat.customerName,
    displayName: chat.customerName || chat.customerPhone,
    adminTakeover: chat.adminTakeover,
    lastMessageAt: chat.lastMessageAt || null,
    lastCustomerMessageAt: chat.lastCustomerMessageAt || null,
    unreadCount: chat.unreadCount,
    status: chat.status,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    canSendFreeform: chat.canSendFreeform,
    freeformWindowEndsAt: chat.freeformWindowEndsAt || null,
    phoneNumber: {
      id: chat.phoneNumber?.id ?? '',
      displayPhoneNumber: chat.phoneNumber?.displayPhoneNumber ?? '',
    },
    lastMessage: chat.messages?.[0]
      ? {
          ...chat.messages[0],
          mediaSize: chat.messages[0].mediaSize?.toString() ?? null,
        }
      : null,
  }));

  return {
    chats,
    total: json.data?.total ?? 0,
  };
}

// ─── Query Options ───────────────────────────────────────────────────

export const conversationQueries = {
  all: (wabaId: string) =>
    queryOptions({
      queryKey: conversationKeys.all(wabaId),
      queryFn: () => fetchAllConversations(wabaId),
      staleTime: Infinity,
      placeholderData: keepPreviousData,
    }),
};

// ─── Hooks ───────────────────────────────────────────────────────────

export function useConversations(wabaId: string | undefined) {
  return useQuery({
    ...conversationQueries.all(wabaId || ''),
    enabled: !!wabaId,
  });
}
