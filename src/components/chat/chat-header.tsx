import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatLastSeen } from '@/lib/chat-format';
import type { ChatConversation } from '@/types/chat';
import { ArrowLeftIcon } from 'lucide-react';

export function ChatHeader({
  conversation,
  showBackButton,
  onBack,
}: {
  conversation: ChatConversation;
  showBackButton: boolean;
  onBack?: () => void;
}) {
  return (
    <div className="flex h-[60px] w-full flex-shrink-0 items-center justify-between gap-3 bg-background px-4">
      <div className="flex items-center gap-3 min-w-0">
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

        <Avatar className="size-10 border shrink-0">
          <AvatarImage
            src={
              conversation.phoneNumber.businessProfile?.profilePictureUrl ??
              undefined
            }
            alt={conversation.displayName}
            className="object-cover"
          />
          <AvatarFallback className="bg-primary/5 text-primary text-sm font-medium">
            {conversation.displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-[15px] font-semibold tracking-tight text-foreground/90">
              {conversation.displayName}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground mt-0.5">
            <span className="truncate">{conversation.customerPhone}</span>
            <span
              className="size-1 rounded-full bg-muted-foreground/30 mx-1"
              aria-hidden="true"
            />
            <span className="truncate">
              {formatLastSeen(conversation.lastCustomerMessageAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
