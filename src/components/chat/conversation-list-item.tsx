import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getMessagePreview } from '@/lib/chat';
import { formatConversationTimestamp } from '@/lib/chat-format';
import { cn } from '@/lib/utils';
import type { ChatConversation } from '@/types/chat';

export function ConversationListItem({
  conversation,
  isActive,
  onSelect,
}: {
  conversation: ChatConversation;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 px-4 py-3 text-left transition-all border-b last:border-b-0 hover:bg-muted/50',
        isActive ? 'bg-muted/60' : 'bg-transparent',
      )}
    >
      <Avatar className="size-11 mt-0.5 border">
        <AvatarFallback className="bg-primary/5 text-primary text-sm font-medium">
          {conversation.displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate font-semibold text-[15px] tracking-tight text-foreground/90">
            {conversation.displayName}
          </div>
          <span
            className={cn(
              'shrink-0 text-xs',
              conversation.unreadCount > 0
                ? 'text-primary font-semibold'
                : 'text-muted-foreground',
            )}
          >
            {formatConversationTimestamp(conversation.lastMessageAt)}
          </span>
        </div>

        <div className="mt-0.5 flex items-center justify-between gap-3">
          <p className="line-clamp-1 flex-1 text-[13px] text-muted-foreground">
            {getMessagePreview(conversation.lastMessage)}
          </p>

          <div className="flex shrink-0 items-center justify-end gap-2 min-w-[2.5rem]">
            {conversation.unreadCount > 0 && (
              <Badge
                variant="default"
                className="rounded-full px-1.5 h-5 min-w-5 flex items-center justify-center text-[10px] font-bold"
              >
                {conversation.unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
