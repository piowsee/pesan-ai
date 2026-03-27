import { MessageStatus } from '@/components/chat/message-status';
import { formatMessageTimestamp } from '@/lib/chat-format';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types/chat';

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isOutgoing = message.direction === 'outgoing';

  return (
    <div
      className={cn(
        'flex w-full',
        isOutgoing ? 'justify-end' : 'justify-start',
      )}
    >
      <div
        className={cn(
          'min-w-[7.5rem] max-w-[85%] rounded-2xl border border-border/40 px-3 py-2 shadow-sm',
          isOutgoing
            ? 'rounded-tr-sm bg-primary/10 text-foreground'
            : 'rounded-tl-sm bg-card text-card-foreground',
        )}
      >
        <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
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
      </div>
    </div>
  );
}
