import { ConversationListItem } from '@/components/chat/conversation-panel/chat-sidebar/conversation-list/conversation-list-item';
import { ChatEmptyState } from '@/components/chat/shared/chat-empty-state';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { ChatConversation } from '@/types/chat';
import { MessageSquareIcon, RefreshCwIcon } from 'lucide-react';

function ConversationListSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex gap-3 px-4 py-3">
          <Skeleton className="size-11 rounded-full shrink-0" />
          <div className="flex-1 flex flex-col gap-2 justify-center">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ConversationList({
  conversations,
  activeConversationId,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onSelectConversation,
  onToggleTakeover,
  pendingTakeoverConversationId,
  emptyTitle = 'No conversations found',
  emptyDescription = 'Try another WABA, adjust the filters, or wait for new customer messages.',
}: {
  conversations: ChatConversation[];
  activeConversationId?: string;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onSelectConversation: (conversationId: string) => void;
  onToggleTakeover: (
    conversationId: string,
    nextAdminTakeover: boolean,
  ) => void;
  pendingTakeoverConversationId?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (isLoading) {
    return <ConversationListSkeleton />;
  }

  if (isError) {
    return (
      <div className="p-2">
        <ChatEmptyState
          title="Unable to load chats"
          description={
            errorMessage ?? 'The inbox could not be loaded right now.'
          }
          icon={RefreshCwIcon}
          actionLabel="Retry"
          onAction={onRetry}
        />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-2">
        <ChatEmptyState
          title={emptyTitle}
          description={emptyDescription}
          icon={MessageSquareIcon}
        />
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ScrollArea className="h-full">
        <div className="flex flex-col">
          {conversations.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === activeConversationId}
              isTakeoverPending={
                pendingTakeoverConversationId === conversation.id
              }
              onSelect={() => onSelectConversation(conversation.id)}
              onToggleTakeover={(nextAdminTakeover) =>
                onToggleTakeover(conversation.id, nextAdminTakeover)
              }
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
