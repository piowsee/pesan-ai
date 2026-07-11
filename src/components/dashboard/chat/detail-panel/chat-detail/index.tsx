import { ChatHeader } from '@/components/dashboard/chat/detail-panel/chat-detail/chat-header';
import { MessageComposer } from '@/components/dashboard/chat/detail-panel/chat-detail/message-composer';
import {
  MessageTimeline,
  MessageTimelineSkeleton,
} from '@/components/dashboard/chat/detail-panel/chat-detail/message-timeline';
import { ChatEmptyState } from '@/components/dashboard/chat/shared/chat-empty-state';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { MessageGroup } from '@/hooks/use-message';
import type { ChatConversation } from '@/types/chat';
import {
  CheckCircleIcon,
  LoaderCircleIcon,
  MessageSquareIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

function MessageHistorySkeleton() {
  return (
    <div className="h-full w-full px-2 py-4 lg:px-4">
      <MessageTimelineSkeleton count={7} />
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
  onToggleTakeover,
  pendingTakeoverConversationId,
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
  onToggleTakeover: (
    conversationId: string,
    nextAdminTakeover: boolean,
  ) => void;
  pendingTakeoverConversationId?: string;
}) {
  const t = useTranslations('Chat.detail');
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);

  if (isLoading && !conversation) {
    return <ChatDetailSkeleton />;
  }

  if (!conversation) {
    return (
      <ChatEmptyState
        title={t('emptyTitle')}
        description={t('emptyDesc')}
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
            key={conversation.id}
            conversationId={conversation.id}
            wabaId={wabaId}
            messages={messages}
            isLoading={isLoading}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadOlderAction={onLoadOlder}
            localSendScrollSignal={localSendScrollSignal}
            initialUnreadCount={initialUnreadCount}
          />
        </div>
      </div>

      <div className="z-10 shrink-0 bg-transparent flex flex-col">
        {conversation.adminTakeover && (
          <div className="bg-brand/10 p-3 mx-4 lg:mx-6 mb-2 rounded-md flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center justify-between border border-brand/20 shadow-sm text-sm">
            <span className="text-foreground/80 font-medium">
              {t('takeoverPrompt')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCloseDialogOpen(true)}
              disabled={pendingTakeoverConversationId === conversation.id}
              className="shrink-0 bg-background"
            >
              {pendingTakeoverConversationId === conversation.id ? (
                <LoaderCircleIcon className="size-4 animate-spin mr-2" />
              ) : (
                <CheckCircleIcon className="size-4 mr-2" />
              )}
              {t('closeConversation')}
            </Button>
            {isCloseDialogOpen && (
              <AlertDialog
                open={isCloseDialogOpen}
                onOpenChange={setIsCloseDialogOpen}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('closeDialogTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('closeDialogDesc', { name: conversation.displayName })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        onToggleTakeover(conversation.id, false);
                        setIsCloseDialogOpen(false);
                      }}
                    >
                      {t('closeConversation')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
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
