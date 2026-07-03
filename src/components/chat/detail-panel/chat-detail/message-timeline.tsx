'use client';

import { MessageBubble } from '@/components/chat/detail-panel/chat-detail/message-bubble/message-bubble';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import type { MessageGroup } from '@/hooks/use-message';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

function getMessagesBelowViewportCount(viewport: HTMLDivElement) {
  const viewportRect = viewport.getBoundingClientRect();
  const messageElements = viewport.querySelectorAll('[data-message-id]');

  return Array.from(messageElements).filter((element) => {
    const messageRect = element.getBoundingClientRect();
    return messageRect.top >= viewportRect.bottom - 1;
  }).length;
}

function getUnreadBoundaryMessageId({
  messages,
  unreadCount,
}: {
  messages: MessageGroup[];
  unreadCount: number;
}) {
  if (unreadCount <= 0) {
    return undefined;
  }

  const incomingMessages = messages
    .flatMap((group) => group.messages)
    .filter((message) => message.direction === 'incoming');

  return incomingMessages.at(-unreadCount)?.id ?? incomingMessages[0]?.id;
}

function MessageTimelineSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-2 py-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className={
            index % 2 === 0 ? 'flex justify-start' : 'flex justify-end'
          }
        >
          <Skeleton className="h-20 w-[70%] rounded-[22px]" />
        </div>
      ))}
    </div>
  );
}

function UnreadMessagesDivider() {
  return (
    <div className="flex items-center gap-3 py-1" aria-label="Unread messages">
      <div className="h-px flex-1 bg-brand/20" />
      <span className="rounded-full border border-brand/20 bg-background/95 px-3 py-1 text-[11px] font-semibold text-brand shadow-sm backdrop-blur-sm">
        Unread messages
      </span>
      <div className="h-px flex-1 bg-brand/20" />
    </div>
  );
}

export function MessageTimeline({
  conversationId,
  wabaId,
  messages,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadOlderAction,
  localSendScrollSignal,
  initialUnreadCount = 0,
}: {
  conversationId?: string;
  wabaId?: string;
  messages: MessageGroup[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadOlderAction: () => void;
  localSendScrollSignal: number;
  initialUnreadCount?: number;
}) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const unreadDividerRef = useRef<HTMLDivElement>(null);
  const previousConversationIdRef = useRef<string | undefined>(undefined);
  const previousMessageCountRef = useRef(0);
  const previousLocalSendScrollSignalRef = useRef(localSendScrollSignal);
  const shouldStickToBottomRef = useRef(true);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [messagesBelowViewportCount, setMessagesBelowViewportCount] =
    useState(0);
  const flattenedMessages = messages.flatMap((group) => group.messages);
  const messageCount = flattenedMessages.length;
  const latestMessageId = flattenedMessages[messageCount - 1]?.id;
  const unreadBoundaryMessageId = getUnreadBoundaryMessageId({
    messages,
    unreadCount: initialUnreadCount,
  });
  const belowViewportMessageCount = isNearBottom
    ? 0
    : messagesBelowViewportCount;

  const getViewport = useCallback(
    () =>
      scrollAreaRef.current?.querySelector(
        '[data-slot="scroll-area-viewport"]',
      ) as HTMLDivElement | null,
    [],
  );

  const scrollToUnreadBoundary = useCallback(() => {
    const viewport = getViewport();
    const unreadDivider = unreadDividerRef.current;

    if (!viewport || !unreadDivider) {
      return;
    }

    requestAnimationFrame(() => {
      viewport.scrollTop = Math.max(0, unreadDivider.offsetTop - 16);
      shouldStickToBottomRef.current = false;
      setIsNearBottom(false);
      setMessagesBelowViewportCount(getMessagesBelowViewportCount(viewport));
    });
  }, [getViewport]);

  const scrollToBottom = useCallback(() => {
    const viewport = getViewport();

    if (!viewport) {
      return;
    }

    const applyScroll = () => {
      viewport.scrollTop = viewport.scrollHeight;
      shouldStickToBottomRef.current = true;
      setIsNearBottom(true);
      setMessagesBelowViewportCount(0);
    };

    applyScroll();
    requestAnimationFrame(applyScroll);
  }, [getViewport]);

  useEffect(() => {
    const viewport = getViewport();

    if (!viewport) {
      return;
    }

    const updateStickiness = () => {
      const distanceFromBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      const nextIsNearBottom = distanceFromBottom <= 96;
      shouldStickToBottomRef.current = nextIsNearBottom;
      setIsNearBottom((current) =>
        current === nextIsNearBottom ? current : nextIsNearBottom,
      );
      setMessagesBelowViewportCount((current) => {
        const nextCount = nextIsNearBottom
          ? 0
          : getMessagesBelowViewportCount(viewport);
        return current === nextCount ? current : nextCount;
      });
    };

    updateStickiness();
    viewport.addEventListener('scroll', updateStickiness, { passive: true });

    return () => {
      viewport.removeEventListener('scroll', updateStickiness);
    };
  }, [conversationId, getViewport]);

  useLayoutEffect(() => {
    const viewport = getViewport();

    if (!viewport || isLoading) {
      return;
    }

    const hasSwitchedConversation =
      previousConversationIdRef.current !== conversationId;
    const hasNewMessages = messageCount > previousMessageCountRef.current;
    const hasLocalSendScrollRequest =
      previousLocalSendScrollSignalRef.current !== localSendScrollSignal;
    const shouldScrollToUnreadBoundary =
      hasSwitchedConversation && Boolean(unreadBoundaryMessageId);
    const shouldScrollToBottom =
      hasLocalSendScrollRequest ||
      (hasSwitchedConversation && !unreadBoundaryMessageId) ||
      (hasNewMessages && shouldStickToBottomRef.current);

    previousConversationIdRef.current = conversationId;
    previousMessageCountRef.current = messageCount;
    previousLocalSendScrollSignalRef.current = localSendScrollSignal;

    if (shouldScrollToUnreadBoundary) {
      scrollToUnreadBoundary();
      return;
    }

    if (shouldScrollToBottom) {
      scrollToBottom();
    }
  }, [
    conversationId,
    isLoading,
    latestMessageId,
    localSendScrollSignal,
    messageCount,
    getViewport,
    scrollToBottom,
    scrollToUnreadBoundary,
    unreadBoundaryMessageId,
  ]);

  useEffect(() => {
    const content = contentRef.current;

    if (!content || isLoading) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      if (shouldStickToBottomRef.current) {
        scrollToBottom();
        return;
      }

      const viewport = getViewport();
      if (viewport) {
        setMessagesBelowViewportCount(getMessagesBelowViewportCount(viewport));
      }
    });

    resizeObserver.observe(content);

    return () => {
      resizeObserver.disconnect();
    };
  }, [getViewport, isLoading, scrollToBottom]);

  return (
    <div ref={scrollAreaRef} className="relative h-full w-full">
      <ScrollArea className="h-full px-2 lg:px-4">
        <div
          ref={contentRef}
          className="flex min-h-full flex-col gap-4 px-2 pt-4 pb-40"
        >
          {hasNextPage ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={onLoadOlderAction}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <ChevronUpIcon data-icon="inline-start" />
                )}
                Load older messages
              </Button>
            </div>
          ) : null}

          {isLoading ? <MessageTimelineSkeleton /> : null}

          {!isLoading && messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center px-6 py-12 text-sm text-muted-foreground">
              No messages yet for this conversation.
            </div>
          ) : null}

          {!isLoading
            ? messages.map((group) => (
                <div key={group.date} className="flex flex-col gap-4">
                  <div className="flex justify-center my-2">
                    <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand/70 uppercase tracking-wider backdrop-blur-sm">
                      {new Date(group.date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  {group.messages.map((message) => (
                    <div
                      key={message.id}
                      data-message-id={message.id}
                      className="flex flex-col gap-4"
                    >
                      {message.id === unreadBoundaryMessageId ? (
                        <div ref={unreadDividerRef}>
                          <UnreadMessagesDivider />
                        </div>
                      ) : null}
                      <MessageBubble message={message} wabaId={wabaId} />
                    </div>
                  ))}
                </div>
              ))
            : null}
        </div>
      </ScrollArea>

      {!isNearBottom && belowViewportMessageCount > 0 ? (
        <div className="pointer-events-none absolute right-4 bottom-5 z-10 flex justify-end">
          <Button
            type="button"
            size="icon"
            onClick={scrollToBottom}
            className="pointer-events-auto relative size-12 rounded-full border border-brand/15 bg-background/95 text-foreground shadow-lg backdrop-blur-sm hover:bg-background"
            aria-label={`Jump to ${belowViewportMessageCount} messages below`}
          >
            <ChevronDownIcon className="size-5" />
            <Badge className="absolute -top-1.5 -right-1.5 min-w-5 justify-center rounded-full px-1.5 py-0 text-[10px] leading-4 shadow-sm">
              {belowViewportMessageCount > 99
                ? '99+'
                : belowViewportMessageCount}
            </Badge>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
