import { conversationKeys } from '@/hooks/use-conversations';
import type { ChatConversation } from '@/types/chat';
import type { QueryClient, QueryKey } from '@tanstack/react-query';

export function updateRealtimeConversationListCache({
  createChat,
  queryClient,
  updateChat,
  wabaId,
}: {
  createChat: () => ChatConversation;
  queryClient: QueryClient;
  updateChat: (chat: ChatConversation) => ChatConversation;
  wabaId: string;
}) {
  queryClient.setQueryData(
    conversationKeys.all(wabaId),
    (old: { chats: ChatConversation[]; total: number } | undefined) => {
      if (!old) return old;

      let found = false;
      const updatedChats = old.chats.map((chat) => {
        const updatedChat = updateChat(chat);
        found = found || updatedChat !== chat;
        return updatedChat;
      });

      if (!found) {
        return {
          ...old,
          chats: [createChat(), ...old.chats],
          total: old.total + 1,
        };
      }

      const sortedChats = [...updatedChats].sort((a, b) => {
        const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return timeB - timeA;
      });

      return { ...old, chats: sortedChats };
    },
  );
}

export async function refetchRealtimeCache(
  queryClient: QueryClient,
  queryKey: QueryKey,
  exact = false,
): Promise<void> {
  const filters = { queryKey, exact };
  await queryClient.cancelQueries(filters);
  await queryClient.invalidateQueries(filters);
}
