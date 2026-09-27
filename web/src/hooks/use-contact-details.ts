'use client';

import { extractJSendErrorMessage } from '@/lib/api-helper/error';
import type { ChatConversation } from '@/types/chat';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { conversationKeys } from './use-conversations';

// ─── Types ───────────────────────────────────────────────────────────

export interface ContactDetailsData {
  label: string | null;
  internalNotes: string | null;
}

interface UpdateContactDetailsParams {
  label?: string | null;
  internalNotes?: string | null;
}

interface ConversationListCache {
  chats: ChatConversation[];
  total: number;
}

// ─── API Functions ───────────────────────────────────────────────────

async function patchContactDetails(
  wabaId: string,
  convId: string,
  params: UpdateContactDetailsParams,
): Promise<ContactDetailsData> {
  const response = await fetch(
    `/api/waba/${wabaId}/conversation/${convId}/contact-details`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
  );

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      extractJSendErrorMessage(body) || 'Failed to update contact details',
    );
  }

  const data = body?.data as ContactDetailsData | undefined;

  return {
    label: data?.label ?? null,
    internalNotes: data?.internalNotes ?? null,
  };
}

// ─── Hooks ───────────────────────────────────────────────────────────

export function useUpdateContactDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      wabaId,
      convId,
      params,
    }: {
      wabaId: string;
      convId: string;
      params: UpdateContactDetailsParams;
    }) => {
      return patchContactDetails(wabaId, convId, params);
    },
    onSuccess: (data, { wabaId, convId }) => {
      // Update the conversation list cache for immediate sidebar reflection
      queryClient.setQueryData<ConversationListCache>(
        conversationKeys.all(wabaId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            chats: old.chats.map((chat) =>
              chat.id === convId
                ? {
                    ...chat,
                    label: data.label,
                    internalNotes: data.internalNotes,
                  }
                : chat,
            ),
          };
        },
      );
    },
  });
}
