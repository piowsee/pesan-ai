import { ChatEmptyState } from '@/components/chat/chat-empty-state';
import { ChatHeader } from '@/components/chat/chat-header';
import { MessageComposer } from '@/components/chat/message-composer';
import { MessageTimeline } from '@/components/chat/message-timeline';
import { Skeleton } from '@/components/ui/skeleton';
import type { ChatConversation, ChatMessage } from '@/types/chat';
import { MessageSquareIcon } from 'lucide-react';

function ChatDetailSkeleton() {
  return (
    <div className="flex h-full w-full flex-col bg-background/50">
      <div className="bg-background px-6 py-4">
        <div className="flex items-center gap-4">
          <Skeleton className="size-11 rounded-full shrink-0" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>
      <div className="flex-1 px-6 py-4">
        <div className="flex flex-col gap-4">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={index}
              className={
                index % 2 === 0 ? 'flex justify-start' : 'flex justify-end'
              }
            >
              <Skeleton className="h-20 w-[60%] rounded-[18px]" />
            </div>
          ))}
        </div>
      </div>
      <div className="border-t px-6 py-4 bg-background">
        <Skeleton className="h-16 rounded-[18px]" />
      </div>
    </div>
  );
}

export function ChatDetail({
  conversation,
  messages,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadOlder,
  isSending,
  onSend,
  showBackButton,
  onBack,
  onContactAreaClick,
}: {
  conversation?: ChatConversation;
  messages: ChatMessage[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadOlder: () => void;
  isSending: boolean;
  onSend: (content: string) => Promise<void>;
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
          <MessageTimeline
            conversationId={conversation.id}
            messages={messages}
            isLoading={isLoading}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadOlder={onLoadOlder}
          />
        </div>
      </div>

      <div className="z-10 shrink-0 bg-transparent">
        <MessageComposer
          key={conversation.id}
          conversation={conversation}
          isSending={isSending}
          onSend={onSend}
        />
      </div>
    </section>
  );
}
