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
          'relative max-w-[85%] rounded-2xl px-3 py-2 shadow-sm border border-border/40',
          isOutgoing
            ? 'rounded-tr-sm bg-primary/10 text-foreground'
            : 'rounded-tl-sm bg-card text-card-foreground',
        )}
      >
        <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed relative z-10 pb-4">
          {message.type === 'text'
            ? message.content
            : `Unsupported ${message.type} message`}
        </div>

        <div
          className={cn(
            'absolute bottom-1.5 right-3 flex items-center gap-1 text-[11px] z-10',
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
