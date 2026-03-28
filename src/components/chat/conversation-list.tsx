'use client';

import { ChatEmptyState } from '@/components/chat/chat-empty-state';
import { ConversationListItem } from '@/components/chat/conversation-list-item';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import type { ChatConversation } from '@/types/chat';
import { MessageSquareIcon, RefreshCwIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';

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
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onRetry,
  onSelectConversation,
}: {
  conversations: ChatConversation[];
  activeConversationId?: string;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  onSelectConversation: (conversationId: string) => void;
}) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = scrollAreaRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]',
    ) as HTMLDivElement | null;
    const target = sentinelRef.current;

    if (!root || !target || !hasNextPage || isFetchingNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      {
        root,
        rootMargin: '200px',
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [conversations.length, hasNextPage, isFetchingNextPage, onLoadMore]);

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
          title="No conversations found"
          description="Try another WABA, adjust the filters, or wait for new customer messages."
          icon={MessageSquareIcon}
        />
      </div>
    );
  }

  return (
    <div ref={scrollAreaRef} className="h-full w-full">
      <ScrollArea className="h-full">
        <div className="flex flex-col">
          {conversations.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === activeConversationId}
              onSelect={() => onSelectConversation(conversation.id)}
            />
          ))}

          <div ref={sentinelRef} className="flex justify-center py-4">
            {isFetchingNextPage ? <Spinner /> : null}
          </div>

          {hasNextPage ? (
            <div className="flex justify-center pb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onLoadMore}
                disabled={isFetchingNextPage}
              >
                Load more
              </Button>
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}
