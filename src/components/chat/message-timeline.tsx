'use client';

import { MessageBubble } from '@/components/chat/message-bubble';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import type { MessageGroup } from '@/hooks/use-message';
import { ChevronUpIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';

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

export function MessageTimeline({
  conversationId,
  messages,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadOlder,
  localSendScrollSignal,
}: {
  conversationId?: string;
  messages: MessageGroup[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadOlder: () => void;
  localSendScrollSignal: number;
}) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const previousConversationIdRef = useRef<string | undefined>(undefined);
  const previousMessageCountRef = useRef(0);
  const previousLocalSendScrollSignalRef = useRef(localSendScrollSignal);
  const shouldStickToBottomRef = useRef(true);
  const messageCount = messages.reduce(
    (count, group) => count + group.messages.length,
    0,
  );

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]',
    ) as HTMLDivElement | null;

    if (!viewport) {
      return;
    }

    const updateStickiness = () => {
      const distanceFromBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      shouldStickToBottomRef.current = distanceFromBottom <= 96;
    };

    updateStickiness();
    viewport.addEventListener('scroll', updateStickiness, { passive: true });

    return () => {
      viewport.removeEventListener('scroll', updateStickiness);
    };
  }, [conversationId]);

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]',
    ) as HTMLDivElement | null;

    if (!viewport) {
      return;
    }

    const hasSwitchedConversation =
      previousConversationIdRef.current !== conversationId;
    const hasNewMessages = messageCount > previousMessageCountRef.current;
    const hasLocalSendScrollRequest =
      previousLocalSendScrollSignalRef.current !== localSendScrollSignal;
    const shouldScroll =
      hasLocalSendScrollRequest ||
      hasSwitchedConversation ||
      (hasNewMessages && shouldStickToBottomRef.current);

    previousConversationIdRef.current = conversationId;
    previousMessageCountRef.current = messageCount;
    previousLocalSendScrollSignalRef.current = localSendScrollSignal;

    if (!shouldScroll) {
      return;
    }

    requestAnimationFrame(() => {
      viewport.scrollTop = viewport.scrollHeight;
      shouldStickToBottomRef.current = true;
    });
  }, [conversationId, localSendScrollSignal, messageCount]);

  return (
    <div ref={scrollAreaRef} className="h-full w-full">
      <ScrollArea className="h-full px-2 lg:px-4">
        <div className="flex min-h-full flex-col gap-4 px-2 pt-4 pb-40">
          {hasNextPage ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={onLoadOlder}
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
                    <MessageBubble key={message.id} message={message} />
                  ))}
                </div>
              ))
            : null}
        </div>
      </ScrollArea>
    </div>
  );
}
