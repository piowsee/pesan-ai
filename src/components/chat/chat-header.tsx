import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatLastSeen } from '@/lib/chat-format';
import { cn } from '@/lib/utils';
import type { ChatConversation } from '@/types/chat';
import { ArrowLeftIcon } from 'lucide-react';

export function ChatHeader({
  conversation,
  showBackButton,
  onBack,
  onContactAreaClick,
}: {
  conversation: ChatConversation;
  showBackButton: boolean;
  onBack?: () => void;
  onContactAreaClick?: () => void;
}) {
  return (
    <div className="flex h-15 w-full shrink-0 items-center bg-background px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {showBackButton && onBack ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="lg:hidden shrink-0 -ml-2 cursor-pointer"
          >
            <ArrowLeftIcon className="size-5" />
            <span className="sr-only">Back to conversations</span>
          </Button>
        ) : null}

        <Button
          variant="unstyled"
          type="button"
          onClick={onContactAreaClick}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1.5 transition-colors',
            onContactAreaClick ? 'cursor-pointer' : 'cursor-default',
          )}
        >
          <Avatar className="size-10 shrink-0 border">
            <AvatarImage
              src={
                conversation.phoneNumber.businessProfile?.profilePictureUrl ??
                undefined
              }
              alt={conversation.displayName}
              className="object-cover"
            />
            <AvatarFallback className="bg-brand/15 text-brand text-sm font-medium">
              {conversation.displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex flex-col justify-center text-left">
            <h2 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
              {conversation.displayName}
            </h2>
            <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-brand/80">
              <span className="truncate">{conversation.customerPhone}</span>
              <span
                className="mx-1 size-1 rounded-full bg-brand/45"
                aria-hidden="true"
              />
              <span className="truncate">
                {formatLastSeen(conversation.lastCustomerMessageAt)}
              </span>
            </div>
          </div>
        </Button>
      </div>
    </div>
  );
}
