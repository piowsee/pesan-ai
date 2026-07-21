import { ConversationAvatar } from '@/components/dashboard/chat/conversation-avatar';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatLastSeen } from '@/lib/chat/chat-format';
import { cn } from '@/lib/utils';
import type { ChatConversation } from '@/types/chat';
import { ArrowLeftIcon, CircleAlertIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function ChatHeader({
  conversation,
  showBackButton,
  onBack,
  onContactAreaClick,
  isContactInfoOpen,
}: {
  conversation: ChatConversation;
  showBackButton: boolean;
  onBack?: () => void;
  onContactAreaClick?: () => void;
  isContactInfoOpen?: boolean;
}) {
  const t = useTranslations('Chat.header');
  const tContact = useTranslations('Chat.contact');
  return (
    <div className="flex h-18 w-full shrink-0 items-center border-b border-border/60 bg-background px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {showBackButton && onBack ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="lg:hidden shrink-0 -ml-2 cursor-pointer hover:bg-transparent"
          >
            <ArrowLeftIcon className="size-5" />
            <span className="sr-only">{t('back')}</span>
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
          <ConversationAvatar conversation={conversation} size="sm" />

          <div className="min-w-0 flex flex-col justify-center text-left">
            <h2 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
              {conversation.displayName}
            </h2>
            <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <span className="truncate">{conversation.contactIdentifier}</span>
              <span
                className="mx-1 size-1 rounded-full bg-muted-foreground/45"
                aria-hidden="true"
              />
              <span className="truncate">
                {formatLastSeen(conversation.lastCustomerMessageAt)}
              </span>
            </div>
          </div>
        </Button>

        {!isContactInfoOpen && onContactAreaClick && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="unstyled"
                  size="icon"
                  onClick={onContactAreaClick}
                  className="shrink-0 text-muted-foreground hover:bg-transparent hover:text-brand mr-2"
                >
                  <CircleAlertIcon className="size-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                sideOffset={8}
                className="bg-white text-black border-none font-medium shadow-md [&_svg]:!hidden"
              >
                <p>{tContact('title')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
