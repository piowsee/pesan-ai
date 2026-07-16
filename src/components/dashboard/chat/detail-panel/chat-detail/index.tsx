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
    <section className="relative flex h-full w-full flex-col bg-background">
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

      <div className="z-10 flex shrink-0 flex-col bg-background">
        {conversation.adminTakeover && (
          <div className="flex w-full flex-col justify-between gap-3 bg-emerald-50 px-4 py-3 text-sm dark:bg-emerald-950/35 sm:flex-row sm:items-center sm:gap-4">
            <span className="font-medium text-emerald-950 dark:text-emerald-100">
              {t('takeoverPrompt')}
            </span>
            <Button
              variant="ghost"
              onClick={() => setIsCloseDialogOpen(true)}
              disabled={pendingTakeoverConversationId === conversation.id}
              className="h-10 px-4 gap-1.5 shrink-0 text-emerald-600 hover:bg-transparent hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400"
            >
              {pendingTakeoverConversationId === conversation.id ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : (
                <CheckCircleIcon className="size-4" />
              )}
              {t('closeConversation')}
            </Button>
            {isCloseDialogOpen && (
              <AlertDialog
                open={isCloseDialogOpen}
                onOpenChange={setIsCloseDialogOpen}
              >
                <AlertDialogContent className="gap-0 overflow-hidden rounded-lg border p-0 shadow-xl sm:max-w-md">
                  <AlertDialogHeader className="px-5 pt-5 pb-4">
                    <div className="flex items-start gap-3">
                      <CheckCircleIcon className="mt-0.5 size-6 shrink-0 text-emerald-600 dark:text-emerald-500" />
                      <div className="min-w-0 text-left">
                        <AlertDialogTitle className="text-base font-semibold">
                          {t('closeDialogTitle')}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {t('closeDialogDesc', {
                            name: conversation.displayName,
                          })}
                        </AlertDialogDescription>
                      </div>
                    </div>
                  </AlertDialogHeader>

                  <div className="px-5">
                    <div className="h-px bg-border" />
                  </div>

                  <div className="flex flex-col px-5 py-4">
                    <AlertDialogFooter className="mx-0 mb-0 gap-2 border-t-0 bg-transparent p-0">
                      <AlertDialogCancel variant="ghost">
                        {t('cancel')}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="!bg-emerald-600 !text-white hover:!bg-emerald-700 dark:!bg-emerald-600 dark:hover:!bg-emerald-700"
                        onClick={() => {
                          onToggleTakeover(conversation.id, false);
                          setIsCloseDialogOpen(false);
                        }}
                      >
                        {t('closeConversation')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </div>
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
