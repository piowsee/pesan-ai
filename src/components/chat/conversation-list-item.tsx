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
  const unreadCount = Number(conversation.unreadCount ?? 0);
  const hasUnread = Number.isFinite(unreadCount) && unreadCount > 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-all',
        isActive
          ? 'bg-brand/10 hover:bg-brand/10'
          : 'bg-transparent hover:bg-brand/5',
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
              hasUnread
                ? 'text-primary font-semibold'
                : 'text-muted-foreground',
            )}
          >
            {formatConversationTimestamp(conversation.lastMessageAt)}
          </span>
        </div>

        <div className="mt-0.5 flex min-w-0 items-center justify-between gap-3">
          <p className="line-clamp-1 min-w-0 flex-1 text-[13px] text-muted-foreground">
            {getMessagePreview(conversation.lastMessage)}
          </p>

          <div className="flex min-w-10 shrink-0 items-center justify-end gap-2">
            {hasUnread && (
              <Badge
                variant="default"
                className="rounded-full px-1.5 h-5 min-w-5 flex items-center justify-center text-[10px] font-bold bg-brand text-brand-foreground"
              >
                {unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
