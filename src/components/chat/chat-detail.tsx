import { ChatEmptyState } from '@/components/chat/chat-empty-state';
import { ChatHeader } from '@/components/chat/chat-header';
import { MessageComposer } from '@/components/chat/message-composer';
import { MessageTimeline } from '@/components/chat/message-timeline';
import { Skeleton } from '@/components/ui/skeleton';
import type { MessageGroup } from '@/hooks/use-message';
import type { ChatConversation } from '@/types/chat';
import { MessageSquareIcon } from 'lucide-react';

function MessageHistorySkeleton() {
  return (
    <div className="h-full w-full px-4 py-4 lg:px-6">
      <div className="flex flex-col gap-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            key={index}
            className={
              index % 2 === 0 ? 'flex justify-start' : 'flex justify-end'
            }
          >
            <Skeleton className="h-20 w-[min(24rem,70%)] rounded-[22px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatDetailSkeleton() {
  return (
    <div className="flex h-full w-full flex-col bg-background/50">
      <div className="bg-background px-6 py-4">
        <div className="flex items-center gap-4">
          <Skeleton className="size-11 shrink-0 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <MessageHistorySkeleton />
      </div>
      <div className="border-t bg-background px-6 py-4">
        <Skeleton className="h-16 rounded-[18px]" />
      </div>
    </div>
  );
}

export function ChatDetail({
  conversation,
  wabaId,
  messages,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadOlder,
  localSendScrollSignal,
  initialUnreadCount,
  onSend,
  onSendMedia,
  showBackButton,
  onBack,
  onContactAreaClick,
}: {
  conversation?: ChatConversation;
  wabaId?: string;
  messages: MessageGroup[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadOlder: () => void;
  localSendScrollSignal: number;
  initialUnreadCount: number;
  onSend: (content: string) => void;
  onSendMedia: (input: { file: File; caption?: string }) => void;
  showBackButton: boolean;
  onBack?: () => void;
  onContactAreaClick?: () => void;
}) {
  if (isLoading && !conversation) {
    return <ChatDetailSkeleton />;
  }

  if (!conversation) {
    return (
      <ChatEmptyState
        title="Select a conversation"
        description="Choose a customer thread from the inbox to review message history and continue the conversation."
        icon={MessageSquareIcon}
        className="h-full"
      />
    );
  }

  return (
    <section className="relative flex h-full w-full flex-col bg-brand/5 dark:bg-brand/10">
      <div className="bg-background">
        <ChatHeader
          conversation={conversation}
          showBackButton={showBackButton}
          onBack={onBack}
          onContactAreaClick={onContactAreaClick}
        />
      </div>

      <div
        className="flex-1 w-full min-h-0 relative bg-cover bg-center"
        style={{ backgroundImage: 'var(--chat-bg, none)' }}
      >
        <div className="absolute inset-0">
          {isLoading ? (
            <MessageHistorySkeleton />
          ) : (
            <MessageTimeline
              key={conversation.id}
              conversationId={conversation.id}
              wabaId={wabaId}
              messages={messages}
              isLoading={false}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onLoadOlderAction={onLoadOlder}
              localSendScrollSignal={localSendScrollSignal}
              initialUnreadCount={initialUnreadCount}
            />
          )}
        </div>
      </div>

      <div className="z-10 shrink-0 bg-transparent">
        <MessageComposer
          key={conversation.id}
          conversation={conversation}
          onSendAction={onSend}
          onSendMediaAction={onSendMedia}
        />
      </div>
    </section>
  );
}
