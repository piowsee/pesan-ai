'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  onSend: (content: string) => Promise<void>;
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

  async function handleSend() {
    if (!conversation.canSendFreeform || !canSendMessage) {
      return;
    }

    await onSend(trimmedDraft);
    setDraft('');
    resetTextarea();
  }

  return (
    <div className="bg-background w-full z-10">
      {!conversation.canSendFreeform ? (
        <Alert
          variant="warning"
          className="mb-2 mx-4 mt-2 border-0 shadow-none bg-amber-50 dark:bg-amber-950/30"
        >
          <div className="flex items-start gap-3">
            <AlertTriangleIcon className="mt-0.5 size-5 text-amber-700 dark:text-amber-200" />
            <div>
              <AlertTitle className="text-sm font-semibold">
                Use template message required
              </AlertTitle>
              <AlertDescription className="text-xs">
                Free-form replies expire 24 hours after the latest customer
                message. Send a template message to reopen the conversation.
              </AlertDescription>
            </div>
          </div>
        </Alert>
      ) : null}

      <div className="flex items-end gap-2 bg-background px-4 py-3">
        <div className="flex-1 flex items-end rounded-2xl border border-border bg-muted/40 px-4 py-2">
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              resizeTextarea(event.currentTarget);
            }}
            onKeyDown={async (event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                await handleSend();
              }
            }}
            maxLength={CHAT_MESSAGE_CHARACTER_LIMIT}
            disabled={!conversation.canSendFreeform || isSending}
            placeholder={
              conversation.canSendFreeform
                ? `Message...`
                : 'Template message required'
            }
            className="min-h-10 max-h-32 resize-none border-0 bg-transparent p-0 py-2.5 text-[15px] leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-100 placeholder:opacity-50"
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
