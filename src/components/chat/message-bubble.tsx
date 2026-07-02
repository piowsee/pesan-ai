import { MessageStatus } from '@/components/chat/message-status';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { formatMessageTimestamp } from '@/lib/chat/chat-format';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types/chat';

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isOutgoing = message.direction === 'outgoing';

  return (
    <Bubble
      align={isOutgoing ? 'end' : 'start'}
      className="max-w-[85%]"
      variant={isOutgoing ? 'tinted' : 'muted'}
    >
      <BubbleContent
        className={cn(
          'min-w-30 rounded-2xl border-border/40 px-3 py-2 shadow-sm',
          isOutgoing ? 'rounded-tr-sm' : 'rounded-tl-sm',
        )}
      >
        <div className="whitespace-pre-wrap wrap-anywhere text-[15px] leading-relaxed">
          {message.type === 'text'
            ? message.content
            : `Unsupported ${message.type} message`}
        </div>

        <div
          className={cn(
            'mt-1.5 flex items-center justify-end gap-1 text-[11px]',
            isOutgoing ? 'text-primary/70' : 'text-muted-foreground/70',
          )}
        >
          <span>{formatMessageTimestamp(message.timestamp)}</span>
          {isOutgoing ? <MessageStatus status={message.status} /> : null}
        </div>
      </BubbleContent>
    </Bubble>
  );
}
