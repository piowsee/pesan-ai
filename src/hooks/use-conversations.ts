'use client';

import { isFreeformWindowOpen } from '@/lib/chat/chat';
import type { ChatConversation } from '@/types/chat';
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

// ─── Query Keys ──────────────────────────────────────────────────────

export const conversationKeys = {
  all: (wabaId: string) => ['conversations', wabaId] as const,
};

// ─── Types ───────────────────────────────────────────────────────────

export interface RawConversation {
  id: string;
  customerPhone: string;
  customerName: string | null;
  adminTakeover: boolean;
  lastMessageAt: string | Date | null;
  lastCustomerMessageAt: string | Date | null;
  unreadCount: number;
  status: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  canSendFreeform?: boolean;
  freeformWindowEndsAt: string | Date | null;
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
    timestamp: string | Date;
    createdAt: string | Date;
  }> | null;
}

export function mapRawConversationToChatConversation(
  chat: RawConversation,
): ChatConversation {
  const lastCustomerMessageAt = chat.lastCustomerMessageAt?.toString() || null;
  const unreadCount = Number(chat.unreadCount ?? 0);

  return {
    id: chat.id,
    customerPhone: chat.customerPhone,
    customerName: chat.customerName,
    displayName: chat.customerName || chat.customerPhone,
    adminTakeover: chat.adminTakeover,
    lastMessageAt: chat.lastMessageAt?.toString() || null,
    lastCustomerMessageAt,
    unreadCount: Number.isFinite(unreadCount) ? unreadCount : 0,
    status: chat.status,
    createdAt: chat.createdAt.toString(),
    updatedAt: chat.updatedAt.toString(),
    canSendFreeform: isFreeformWindowOpen(lastCustomerMessageAt),
    freeformWindowEndsAt: chat.freeformWindowEndsAt?.toString() || null,
    phoneNumber: {
      id: chat.phoneNumber?.id ?? '',
      displayPhoneNumber: chat.phoneNumber?.displayPhoneNumber ?? '',
    },
    lastMessage: chat.messages?.[0]
      ? {
          ...chat.messages[0],
          mediaSize: chat.messages[0].mediaSize?.toString() ?? null,
          timestamp: chat.messages[0].timestamp.toString(),
          createdAt: chat.messages[0].createdAt.toString(),
        }
      : null,
  };
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

  const chats: ChatConversation[] = rawChats.map(
    mapRawConversationToChatConversation,
  );

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

// ─── Mutations ──────────────────────────────────────────────────────

interface MarkAsReadData {
  wabaId: string;
  convId: string;
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ wabaId, convId }: MarkAsReadData) => {
      const response = await fetch(
        `/api/waba/${wabaId}/conversation/${convId}/read`,
        { method: 'PATCH' },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message =
          body?.data?.message ?? 'Failed to mark conversation as read';
        throw new Error(message);
      }

      return response.json();
    },
    onMutate: async ({ wabaId, convId }) => {
      await queryClient.cancelQueries({
        queryKey: conversationKeys.all(wabaId),
      });

      const previous = queryClient.getQueryData<{
        chats: ChatConversation[];
        total: number;
      }>(conversationKeys.all(wabaId));

      queryClient.setQueryData<{ chats: ChatConversation[]; total: number }>(
        conversationKeys.all(wabaId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            chats: old.chats.map((chat) =>
              chat.id === convId ? { ...chat, unreadCount: 0 } : chat,
            ),
          };
        },
      );

      return { previous };
    },
    onError: (_err, { wabaId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          conversationKeys.all(wabaId),
          context.previous,
        );
      }
    },
  });
}
