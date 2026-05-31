import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  const messagePreview = getMessagePreview(conversation.lastMessage);

  return (
    <Button
      variant="unstyled"
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full min-w-0 overflow-hidden cursor-pointer items-start gap-3 px-4 py-3 text-left transition-all',
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

      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <div className="min-w-0 flex-1 truncate font-semibold text-[15px] tracking-tight text-foreground/90">
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

        <div className="mt-0.5 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 overflow-hidden">
          <p
            className="block min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-muted-foreground"
            title={messagePreview}
          >
            {messagePreview}
          </p>

          <div className="flex min-w-fit shrink-0 items-center justify-end">
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
    </Button>
  );
}
