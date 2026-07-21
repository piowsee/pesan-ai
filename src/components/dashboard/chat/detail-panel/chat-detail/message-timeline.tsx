'use client';

import { MessageBubble } from '@/components/dashboard/chat/detail-panel/chat-detail/message-bubble/message-bubble';
import {
  UnreadMessagesDivider,
  getUnreadBoundaryMessageId,
  getUnreadMessageIdsFromBoundary,
  shouldRenderUnreadDivider,
} from '@/components/dashboard/chat/shared/unread-divider';
import { useRealtime } from '@/components/realtime-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import type {
  MediaDownloadUrlResponse,
  MessageGroup,
} from '@/hooks/use-message';
import { cn } from '@/lib/utils';
import { ChevronDownIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export function MessageTimeline({
  conversationId,
  wabaId,
  messages,
  mediaDownloadUrls,
  mediaDownloadUrlsError,
  isMediaDownloadUrlsError,
  areMediaDownloadUrlsStale,
  onRefreshMediaDownloadUrls,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadOlderAction,
  localSendScrollSignal,
  initialUnreadCount = 0,
  unreadCount = 0,
  onClearUnreadAction,
  onUnreadMessagesViewedAction,
}: {
  conversationId?: string;
  wabaId?: string;
  messages: MessageGroup[];
  mediaDownloadUrls: Record<string, MediaDownloadUrlResponse>;
  mediaDownloadUrlsError: unknown;
  isMediaDownloadUrlsError: boolean;
  areMediaDownloadUrlsStale: boolean;
  onRefreshMediaDownloadUrls: () => Promise<
    Record<string, MediaDownloadUrlResponse> | undefined
  >;
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadOlderAction: () => void;
  localSendScrollSignal: number;
  initialUnreadCount?: number;
  unreadCount?: number;
  onClearUnreadAction: () => void;
  onUnreadMessagesViewedAction: (viewedCount: number) => void;
}) {
  const t = useTranslations('Chat.timeline');
  const { setViewingConversationAtBottom } = useRealtime();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const unreadDividerRef = useRef<HTMLDivElement>(null);
  const loadOlderSentinelRef = useRef<HTMLDivElement>(null);
  const loadOlderScrollSnapshotRef = useRef<
    | {
        scrollHeight: number;
        scrollTop: number;
      }
    | undefined
  >(undefined);
  const isLoadOlderRequestedRef = useRef(false);
  const previousConversationIdRef = useRef<string | undefined>(undefined);
  const previousMessageCountRef = useRef(0);
  const previousLocalSendScrollSignalRef = useRef(localSendScrollSignal);
  const shouldStickToBottomRef = useRef(true);
  const seenUnreadMessageIdsRef = useRef(new Set<string>());
  const [sessionInitialUnreadCount] = useState(initialUnreadCount);
  const [isNearBottom, setIsNearBottom] = useState(initialUnreadCount <= 0);
  const [hasInitialScrollCompleted, setHasInitialScrollCompleted] =
    useState(false);
  const [sessionUnreadBoundaryMessageId, setSessionUnreadBoundaryMessageId] =
    useState<string | null | undefined>(undefined);
  const flattenedMessages = messages.flatMap((group) => group.messages);

  const messageCount = flattenedMessages.length;
  const latestMessageId = flattenedMessages[messageCount - 1]?.id;
  const initialUnreadBoundaryMessageId = getUnreadBoundaryMessageId({
    messages,
    unreadCount: sessionInitialUnreadCount,
  });
  const unreadBoundaryMessageId =
    sessionUnreadBoundaryMessageId === null
      ? undefined
      : (sessionUnreadBoundaryMessageId ?? initialUnreadBoundaryMessageId);
  const visibilityBoundaryMessageId =
    unreadBoundaryMessageId ??
    getUnreadBoundaryMessageId({ messages, unreadCount });
  const unreadMessageIds = useMemo(
    () =>
      new Set(
        getUnreadMessageIdsFromBoundary({
          messages,
          unreadBoundaryMessageId: visibilityBoundaryMessageId,
        }),
      ),
    [messages, visibilityBoundaryMessageId],
  );

  const reportViewedUnreadElements = useCallback(
    (elements: Iterable<HTMLElement>) => {
      let viewedCount = 0;

      for (const element of elements) {
        const messageId = element.dataset.messageId;

        if (messageId && !seenUnreadMessageIdsRef.current.has(messageId)) {
          seenUnreadMessageIdsRef.current.add(messageId);
          viewedCount += 1;
        }
      }

      if (viewedCount > 0) {
        onUnreadMessagesViewedAction(viewedCount);
      }
    },
    [onUnreadMessagesViewedAction],
  );

  const getViewport = useCallback(
    () =>
      scrollAreaRef.current?.querySelector(
        '[data-slot="scroll-area-viewport"]',
      ) as HTMLDivElement | null,
    [],
  );

  const requestOlderMessages = useCallback(() => {
    const viewport = getViewport();
    const distanceFromBottom = viewport
      ? viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
      : 0;

    if (
      !viewport ||
      isLoading ||
      !hasInitialScrollCompleted ||
      !hasNextPage ||
      isFetchingNextPage ||
      viewport.scrollTop > 96 ||
      distanceFromBottom <= 96 ||
      isLoadOlderRequestedRef.current
    ) {
      return;
    }

    loadOlderScrollSnapshotRef.current = {
      scrollHeight: viewport.scrollHeight,
      scrollTop: viewport.scrollTop,
    };
    isLoadOlderRequestedRef.current = true;
    shouldStickToBottomRef.current = false;
    setIsNearBottom(false);
    onLoadOlderAction();
  }, [
    getViewport,
    hasInitialScrollCompleted,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    onLoadOlderAction,
  ]);

  useEffect(() => {
    const viewport = getViewport();
    const sentinel = loadOlderSentinelRef.current;

    if (
      !viewport ||
      !sentinel ||
      isLoading ||
      !hasInitialScrollCompleted ||
      !hasNextPage
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          requestOlderMessages();
        }
      },
      { root: viewport, threshold: 0.1 },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [
    getViewport,
    hasInitialScrollCompleted,
    hasNextPage,
    isLoading,
    requestOlderMessages,
  ]);

  useLayoutEffect(() => {
    if (isFetchingNextPage) {
      return;
    }

    const viewport = getViewport();
    const snapshot = loadOlderScrollSnapshotRef.current;

    if (viewport && snapshot) {
      const addedHeight = viewport.scrollHeight - snapshot.scrollHeight;
      viewport.scrollTop = snapshot.scrollTop + Math.max(0, addedHeight);
    }

    loadOlderScrollSnapshotRef.current = undefined;
    isLoadOlderRequestedRef.current = false;
  }, [getViewport, isFetchingNextPage, messageCount]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    setViewingConversationAtBottom(conversationId, isNearBottom);

    return () => {
      setViewingConversationAtBottom(conversationId, undefined);
    };
  }, [conversationId, isNearBottom, setViewingConversationAtBottom]);

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
      setHasInitialScrollCompleted(true);
    });
  }, [getViewport]);

  const scrollToBottom = useCallback(
    (options?: { smooth?: boolean }) => {
      const viewport = getViewport();

      if (!viewport) {
        return;
      }

      const applyScroll = () => {
        if (options?.smooth) {
          viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
        } else {
          viewport.scrollTop = viewport.scrollHeight;
        }
        shouldStickToBottomRef.current = true;
        setIsNearBottom(true);
        setHasInitialScrollCompleted(true);
      };

      if (options?.smooth) {
        applyScroll();
      } else {
        applyScroll();
        requestAnimationFrame(applyScroll);
      }
    },
    [getViewport],
  );

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
    };

    updateStickiness();
    viewport.addEventListener('scroll', updateStickiness, { passive: true });

    return () => {
      viewport.removeEventListener('scroll', updateStickiness);
    };
  }, [conversationId, getViewport]);

  useEffect(() => {
    if (
      sessionUnreadBoundaryMessageId !== undefined ||
      !visibilityBoundaryMessageId
    ) {
      return;
    }

    if (sessionInitialUnreadCount <= 0 && (isNearBottom || unreadCount <= 0)) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      setSessionUnreadBoundaryMessageId(visibilityBoundaryMessageId);
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [
    isNearBottom,
    sessionInitialUnreadCount,
    sessionUnreadBoundaryMessageId,
    unreadCount,
    visibilityBoundaryMessageId,
  ]);

  useEffect(() => {
    const viewport = getViewport();

    if (
      !viewport ||
      !hasInitialScrollCompleted ||
      isLoading ||
      unreadMessageIds.size === 0 ||
      typeof IntersectionObserver === 'undefined'
    ) {
      return;
    }

    const unreadElements = Array.from(
      viewport.querySelectorAll<HTMLElement>('[data-unread-message="true"]'),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleElements = entries
          .filter(
            (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5,
          )
          .map((entry) => entry.target as HTMLElement);

        reportViewedUnreadElements(visibleElements);

        for (const element of visibleElements) {
          if (
            element.dataset.messageId &&
            seenUnreadMessageIdsRef.current.has(element.dataset.messageId)
          ) {
            observer.unobserve(element);
          }
        }
      },
      { root: viewport, threshold: 0.5 },
    );

    for (const element of unreadElements) {
      if (
        element.dataset.messageId &&
        !seenUnreadMessageIdsRef.current.has(element.dataset.messageId)
      ) {
        observer.observe(element);
      }
    }

    let isDisposed = false;
    const reconcileVisibleUnreadElements = () => {
      if (isDisposed) {
        return;
      }

      const viewportRect = viewport.getBoundingClientRect();
      const visibleElements = unreadElements.filter((element) => {
        const elementRect = element.getBoundingClientRect();
        const visibleHeight =
          Math.min(elementRect.bottom, viewportRect.bottom) -
          Math.max(elementRect.top, viewportRect.top);

        return visibleHeight >= elementRect.height * 0.5;
      });

      reportViewedUnreadElements(visibleElements);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        queueMicrotask(reconcileVisibleUnreadElements);
      }
    };
    queueMicrotask(reconcileVisibleUnreadElements);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isDisposed = true;
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    getViewport,
    hasInitialScrollCompleted,
    isLoading,
    reportViewedUnreadElements,
    unreadMessageIds,
  ]);

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

    if (hasLocalSendScrollRequest) {
      requestAnimationFrame(() => {
        setSessionUnreadBoundaryMessageId(null);
      });
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
      }
    });

    resizeObserver.observe(content);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isLoading, scrollToBottom]);

  const handleScrollToBottom = useCallback(() => {
    setSessionUnreadBoundaryMessageId(null);
    onClearUnreadAction();
    scrollToBottom({ smooth: true });
  }, [onClearUnreadAction, scrollToBottom]);

  return (
    <div ref={scrollAreaRef} className="relative h-full w-full">
      <ScrollArea className="h-full px-2 lg:px-4">
        <div
          ref={contentRef}
          className="flex min-h-full flex-col gap-4 px-2 pt-4"
        >
          {hasNextPage || isFetchingNextPage ? (
            <div
              ref={hasNextPage ? loadOlderSentinelRef : undefined}
              className="flex h-10 items-center justify-center"
              aria-label={t('loading')}
              aria-live="polite"
            >
              {isFetchingNextPage ? (
                <Spinner className="text-muted-foreground" />
              ) : null}
            </div>
          ) : null}

          {!isLoading && messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center px-6 py-12 text-sm text-muted-foreground">
              {t('empty')}
            </div>
          ) : null}

          {!isLoading
            ? messages.map((group) => {
                const groupDate = new Date(group.date);
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);

                let dateLabel = '';
                if (
                  groupDate.getDate() === today.getDate() &&
                  groupDate.getMonth() === today.getMonth() &&
                  groupDate.getFullYear() === today.getFullYear()
                ) {
                  dateLabel = t('today');
                } else if (
                  groupDate.getDate() === yesterday.getDate() &&
                  groupDate.getMonth() === yesterday.getMonth() &&
                  groupDate.getFullYear() === yesterday.getFullYear()
                ) {
                  dateLabel = t('yesterday');
                } else {
                  dateLabel = groupDate.toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                  });
                }

                return (
                  <div key={group.date} className="flex flex-col mb-4">
                    <div className="sticky top-2 z-10 flex justify-center my-2">
                      <span className="rounded-full bg-background/95 backdrop-blur px-2.5 py-0.5 text-[11px] font-medium text-foreground uppercase tracking-wider shadow-sm ring-1 ring-foreground/5">
                        {dateLabel}
                      </span>
                    </div>
                    {group.messages.map((message, index) => {
                      const previousMessage = group.messages[index - 1];
                      const nextMessage = group.messages[index + 1];
                      const isFirstInGroup =
                        previousMessage?.direction !== message.direction;
                      const isSameSenderAsNext =
                        nextMessage?.direction === message.direction;

                      return (
                        <div
                          key={message.optimisticId || message.id}
                          className={cn(
                            'flex flex-col',
                            isSameSenderAsNext ? 'mb-[6px]' : 'mb-[10px]',
                          )}
                        >
                          {shouldRenderUnreadDivider({
                            messageId: message.id,
                            unreadBoundaryMessageId,
                          }) ? (
                            <div ref={unreadDividerRef} className="mb-4">
                              <UnreadMessagesDivider />
                            </div>
                          ) : null}
                          <div
                            data-message-id={message.id}
                            data-unread-message={
                              unreadMessageIds.has(message.id)
                                ? 'true'
                                : undefined
                            }
                          >
                            <MessageBubble
                              message={message}
                              wabaId={wabaId}
                              mediaDownloadUrl={
                                message.mediaObjectKey
                                  ? mediaDownloadUrls[message.mediaObjectKey]
                                  : undefined
                              }
                              mediaDownloadUrlsError={mediaDownloadUrlsError}
                              isMediaDownloadUrlsError={
                                isMediaDownloadUrlsError
                              }
                              areMediaDownloadUrlsStale={
                                areMediaDownloadUrlsStale
                              }
                              onRefreshMediaDownloadUrls={
                                onRefreshMediaDownloadUrls
                              }
                              isFirstInGroup={isFirstInGroup}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            : null}
        </div>
      </ScrollArea>

      <AnimatePresence>
        {!isNearBottom ? (
          <motion.div
            initial={{ opacity: 0, filter: 'blur(4px)', scale: 0.9, y: 10 }}
            animate={{ opacity: 1, filter: 'blur(0px)', scale: 1, y: 0 }}
            exit={{ opacity: 0, filter: 'blur(4px)', scale: 0.9, y: 10 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className="pointer-events-none absolute right-3 bottom-4 z-50 flex justify-end"
          >
            <Button
              type="button"
              size="icon"
              onClick={handleScrollToBottom}
              className="pointer-events-auto relative size-12 rounded-full border border-brand/15 bg-background/95 text-foreground shadow-lg backdrop-blur hover:bg-background"
              aria-label="Scroll to bottom"
            >
              <ChevronDownIcon className="size-6" />
              <AnimatePresence>
                {unreadCount > 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    className="absolute -top-1.5 -right-1.5"
                  >
                    <Badge className="min-w-5 justify-center rounded-full bg-brand px-1.5 py-0 text-[10px] leading-4 text-brand-foreground shadow-sm">
                      {unreadCount}
                    </Badge>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
