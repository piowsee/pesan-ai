'use client';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { CHAT_MESSAGE_CHARACTER_LIMIT } from '@/lib/chat';
import type { ChatConversation } from '@/types/chat';
import { AlertTriangleIcon, SendHorizontalIcon } from 'lucide-react';
import { useRef, useState } from 'react';

export function MessageComposer({
  conversation,
  isSending,
  onSend,
}: {
  conversation: ChatConversation;
  isSending: boolean;
  onSend: (content: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = (target?: HTMLTextAreaElement | null) => {
    const element = target ?? textareaRef.current;
    if (!element) {
      return;
    }

    const maxHeightPx = 128;
    element.style.height = 'auto';
    const nextHeight = Math.min(element.scrollHeight, maxHeightPx);
    element.style.height = `${nextHeight}px`;
    element.style.overflowY =
      element.scrollHeight > maxHeightPx ? 'auto' : 'hidden';
  };

  const resetTextarea = () => {
    if (!textareaRef.current) {
      return;
    }
    textareaRef.current.style.height = '40px';
    textareaRef.current.style.overflowY = 'hidden';
  };

  const trimmedDraft = draft.trim();
  const canSendMessage = Boolean(trimmedDraft) && !isSending;

  function handleSend() {
    if (!conversation.canSendFreeform || !canSendMessage) {
      return;
    }

    onSend(trimmedDraft);
    setDraft('');
    resetTextarea();
  }

  return (
    <div className="w-full shrink-0 bg-transparent pb-3">
      {!conversation.canSendFreeform ? (
        <div className="mx-4 my-2 flex items-center gap-3 rounded-xl border border-amber-400/40 bg-amber-50 px-4 py-3 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
          <AlertTriangleIcon className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Use template message required
            </p>
            <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-200/80">
              Free-form replies expire 24 hours after the latest customer
              message. Send a template message to reopen the conversation.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex items-end gap-2 bg-transparent px-4 py-1">
        <div className="flex flex-1 items-end rounded-2xl border border-brand/15 bg-brand/5 px-4 py-2 shadow-sm transition-colors focus-within:border-brand/30 focus-within:bg-brand/10">
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              resizeTextarea(event.currentTarget);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            maxLength={CHAT_MESSAGE_CHARACTER_LIMIT}
            disabled={!conversation.canSendFreeform || isSending}
            placeholder={
              conversation.canSendFreeform
                ? `Message...`
                : 'Template message required'
            }
            className="min-h-10 max-h-32 resize-none border-0 bg-transparent p-0 py-2.5 text-[15px] leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-100 placeholder:opacity-50 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          />

          <Button
            onClick={handleSend}
            disabled={!conversation.canSendFreeform || !canSendMessage}
            size="icon"
            variant="ghost"
            className={`mb-0.5 size-10 shrink-0 rounded-full transition-colors cursor-pointer ${canSendMessage ? 'text-primary hover:text-primary hover:bg-primary/10' : 'text-muted-foreground/40 hover:text-muted-foreground/40 hover:bg-transparent'}`}
          >
            {isSending ? (
              <Spinner className="size-5" />
            ) : (
              <SendHorizontalIcon className="size-5" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
