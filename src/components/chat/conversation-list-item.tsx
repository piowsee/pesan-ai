import { ConversationActionsMenu } from '@/components/chat/conversation-actions-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getMessagePreview } from '@/lib/chat/chat';
import { formatConversationTimestamp } from '@/lib/chat/chat-format';
import { cn } from '@/lib/utils';
import type { ChatConversation } from '@/types/chat';

export function getConversationStatusLabel(adminTakeover: boolean) {
  return adminTakeover ? 'Admin' : 'Bot';
}

export function shouldHighlightAdminConversation(params: {
  adminTakeover: boolean;
  unreadCount: number;
}) {
  const { adminTakeover, unreadCount } = params;
  return adminTakeover && Number.isFinite(unreadCount) && unreadCount > 0;
}

export function ConversationListItem({
  conversation,
  isActive,
  isTakeoverPending,
  onSelect,
  onToggleTakeover,
}: {
  conversation: ChatConversation;
  isActive: boolean;
  isTakeoverPending?: boolean;
  onSelect: () => void;
  onToggleTakeover: (nextAdminTakeover: boolean) => void;
}) {
  const unreadCount = Number(conversation.unreadCount ?? 0);
  const hasUnread = Number.isFinite(unreadCount) && unreadCount > 0;
  const requiresAdminResponse = shouldHighlightAdminConversation({
    adminTakeover: conversation.adminTakeover,
    unreadCount,
  });
  const messagePreview = getMessagePreview(conversation.lastMessage);
  const statusLabel = getConversationStatusLabel(conversation.adminTakeover);

  return (
    <div
      className={cn(
        'group flex w-full min-w-0 overflow-hidden transition-all',
        isActive
          ? 'bg-brand/10 hover:bg-brand/10'
          : hasUnread
            ? 'bg-brand/5 hover:bg-brand/8'
            : 'bg-transparent hover:bg-brand/5',
        requiresAdminResponse &&
          'bg-amber-50/90 ring-1 ring-inset ring-amber-400/45 shadow-sm hover:bg-amber-100/80 dark:bg-amber-500/10 dark:ring-amber-400/25 dark:hover:bg-amber-500/15',
      )}
    >
      <Button
        variant="unstyled"
        type="button"
        onClick={onSelect}
        aria-label={`Open conversation with ${conversation.displayName}${requiresAdminResponse ? ', requires admin response' : ''}`}
        className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 px-4 py-3 text-left"
      >
        <Avatar className="mt-0.5 size-11 border">
          <AvatarFallback className="bg-primary/5 text-sm font-medium text-primary">
            {conversation.displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <div className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight text-foreground/90">
              {conversation.displayName}
            </div>
            <span
              className={cn(
                'shrink-0 text-xs',
                hasUnread
                  ? 'font-semibold text-primary'
                  : 'text-muted-foreground',
              )}
            >
              {formatConversationTimestamp(conversation.lastMessageAt)}
            </span>
          </div>

          <div className="mt-0.5 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 overflow-hidden">
            <p
              className="block min-w-0 max-w-full truncate text-[13px] text-muted-foreground"
              title={messagePreview}
            >
              {messagePreview}
            </p>

            <div className="flex min-w-fit shrink-0 items-center justify-end gap-1.5">
              <Badge
                variant={conversation.adminTakeover ? 'outline' : 'secondary'}
                className={cn(
                  'px-1.5 text-[10px] font-semibold',
                  requiresAdminResponse &&
                    'border-amber-500/45 bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100',
                )}
              >
                {statusLabel}
              </Badge>

              {hasUnread && (
                <Badge
                  variant="default"
                  className={cn(
                    'flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-brand-foreground',
                    requiresAdminResponse &&
                      'bg-amber-600 text-white dark:bg-amber-500 dark:text-amber-950',
                  )}
                >
                  {unreadCount}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Button>

      <div className="flex shrink-0 items-center pr-3">
        <ConversationActionsMenu
          conversation={conversation}
          isTakeoverPending={isTakeoverPending}
          onToggleTakeover={onToggleTakeover}
        />
      </div>
    </div>
  );
}
