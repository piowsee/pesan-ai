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
import { cn } from '@/lib/utils';
import type { ChatConversation } from '@/types/chat';
import {
  LoaderCircleIcon,
  MessageSquareIcon,
  UserRoundCheckIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { TbArrowLoopLeft } from 'react-icons/tb';

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
  unreadCount,
  onClearUnread,
  onUnreadMessagesViewed,
  onSend,
  onSendMedia,
  showBackButton,
  onBack,
  onContactAreaClick,
  onToggleTakeover,
  pendingTakeoverConversationId,
  isContactInfoOpen,
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
  unreadCount: number;
  onClearUnread: () => void;
  onUnreadMessagesViewed: (viewedCount: number) => void;
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
  isContactInfoOpen?: boolean;
}) {
  const t = useTranslations('Chat.detail');
  const [isTakeoverDialogOpen, setIsTakeoverDialogOpen] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);

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

  const isPending = pendingTakeoverConversationId === conversation.id;

  return (
    <section className="relative flex h-full w-full flex-col bg-background">
      <div className="bg-background">
        <ChatHeader
          conversation={conversation}
          showBackButton={showBackButton}
          onBack={onBack}
          onContactAreaClick={onContactAreaClick}
          isContactInfoOpen={isContactInfoOpen}
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
            unreadCount={unreadCount}
            onClearUnreadAction={onClearUnread}
            onUnreadMessagesViewedAction={onUnreadMessagesViewed}
          />
        </div>
      </div>

      <div className="z-10 flex shrink-0 flex-col bg-background">
        {conversation.adminTakeover ? (
          <>
            {/* Banner: Return to AI Agent */}
            <div
              className={cn(
                'flex min-h-[56px] w-full flex-col justify-between gap-3 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:gap-4',
                conversation.canSendFreeform
                  ? 'bg-amber-50 dark:bg-amber-950/35'
                  : 'bg-red-50 dark:bg-red-950/35',
              )}
            >
              <span
                className={cn(
                  'font-medium',
                  conversation.canSendFreeform
                    ? 'text-amber-950 dark:text-amber-100'
                    : 'text-red-950 dark:text-red-100',
                )}
              >
                {conversation.canSendFreeform
                  ? t('takeoverPrompt')
                  : t('takeoverExpiredPrompt')}
              </span>
              <Button
                variant="ghost"
                onClick={() => setIsReturnDialogOpen(true)}
                disabled={isPending}
                className={cn(
                  'h-9 shrink-0 gap-1.5 px-4 hover:bg-transparent',
                  conversation.canSendFreeform
                    ? 'text-amber-700 hover:text-amber-800 dark:text-amber-500 dark:hover:text-amber-400'
                    : 'text-red-700 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400',
                )}
              >
                {isPending ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : (
                  <TbArrowLoopLeft className="size-4" />
                )}
                {t('returnToAgent')}
              </Button>
            </div>

            {/* Return to AI Agent confirmation dialog */}
            {isReturnDialogOpen && (
              <AlertDialog
                open={isReturnDialogOpen}
                onOpenChange={setIsReturnDialogOpen}
              >
                <AlertDialogContent className="gap-0 overflow-hidden rounded-lg border p-0 shadow-xl sm:max-w-md">
                  <AlertDialogHeader className="px-5 pt-5 pb-4">
                    <div className="flex items-start gap-3">
                      <TbArrowLoopLeft className="mt-0.5 size-6 shrink-0 text-amber-600 dark:text-amber-500" />
                      <div className="min-w-0 text-left">
                        <AlertDialogTitle className="text-base font-semibold">
                          {t('returnDialogTitle')}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {t('returnDialogDesc', {
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
                        className="!bg-brand !text-brand-foreground hover:!bg-brand/90"
                        onClick={() => {
                          onToggleTakeover(conversation.id, false);
                          setIsReturnDialogOpen(false);
                        }}
                      >
                        {t('returnToAgent')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Show message composer when admin has taken over */}
            <MessageComposer
              key={conversation.id}
              conversation={conversation}
              onSendAction={onSend}
              onSendMediaAction={onSendMedia}
            />
          </>
        ) : (
          <>
            {/* Banner: AI Agent is active */}
            <div
              className={cn(
                'flex min-h-[56px] w-full flex-col justify-center gap-3 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-start sm:gap-4',
                conversation.canSendFreeform
                  ? 'bg-emerald-50 dark:bg-emerald-950/35'
                  : 'bg-red-50 dark:bg-red-950/35',
              )}
            >
              <span
                className={cn(
                  'font-medium',
                  conversation.canSendFreeform
                    ? 'text-emerald-950 dark:text-emerald-100'
                    : 'text-red-950 dark:text-red-100',
                )}
              >
                {conversation.canSendFreeform
                  ? t('agentActivePrompt')
                  : t('agentActiveExpiredPrompt')}
              </span>
            </div>

            {/* Big red Take Over button replacing the composer */}
            <div className="flex items-center justify-center px-4 pb-3 pt-0">
              <Button
                onClick={() => setIsTakeoverDialogOpen(true)}
                disabled={isPending || !conversation.canSendFreeform}
                className="h-14 w-full gap-2.5 rounded-2xl bg-brand text-base font-semibold text-brand-foreground shadow-sm transition-colors hover:bg-brand/90"
              >
                {isPending ? (
                  <LoaderCircleIcon className="size-5 animate-spin" />
                ) : (
                  <UserRoundCheckIcon className="size-5" />
                )}
                {t('takeoverButton')}
              </Button>
            </div>

            {/* Take Over confirmation dialog (red) */}
            {isTakeoverDialogOpen && (
              <AlertDialog
                open={isTakeoverDialogOpen}
                onOpenChange={setIsTakeoverDialogOpen}
              >
                <AlertDialogContent className="gap-0 overflow-hidden rounded-lg border p-0 shadow-xl sm:max-w-md">
                  <AlertDialogHeader className="px-5 pt-5 pb-4">
                    <div className="flex items-start gap-3">
                      <UserRoundCheckIcon className="mt-0.5 size-6 shrink-0 text-brand" />
                      <div className="min-w-0 text-left">
                        <AlertDialogTitle className="text-base font-semibold">
                          {t('takeoverDialogTitle')}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {t('takeoverDialogDesc', {
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
                        className="!bg-brand !text-brand-foreground hover:!bg-brand/90"
                        onClick={() => {
                          onToggleTakeover(conversation.id, true);
                          setIsTakeoverDialogOpen(false);
                        }}
                      >
                        {t('takeoverButton')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        )}
      </div>
    </section>
  );
}
