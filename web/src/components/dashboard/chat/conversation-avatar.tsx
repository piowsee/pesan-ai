import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { ChatConversation } from '@/types/chat';
import { FaWhatsappSquare } from 'react-icons/fa';

export interface ConversationAvatarProps {
  conversation: Pick<ChatConversation, 'displayName' | 'messagingProduct'>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  avatarClassName?: string;
  fallbackClassName?: string;
}

export function ConversationAvatar({
  conversation,
  size = 'md',
  className,
  avatarClassName,
  fallbackClassName,
}: ConversationAvatarProps) {
  const avatarSize = {
    sm: 'size-10', // chat header
    md: 'size-11', // conversation list
    lg: 'size-12', // contact info panel
  }[size];

  const iconSize = {
    sm: 'size-4',
    md: 'size-4.5',
    lg: 'size-5', // size-5 is good for size-12 too
  }[size];

  return (
    <div className={cn('relative shrink-0', className)}>
      <Avatar className={cn('border', avatarSize, avatarClassName)}>
        <AvatarFallback
          className={cn(
            'bg-brand text-sm font-medium text-brand-foreground',
            fallbackClassName,
          )}
        >
          {conversation.displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      {conversation.messagingProduct === 'whatsapp' && size === 'md' && (
        <div className="absolute -bottom-0.5 -right-0 flex items-center justify-center">
          <div className="absolute size-[80%] rounded-sm bg-white" />
          <FaWhatsappSquare
            className={cn('relative z-10 text-[#25D366]', iconSize)}
          />
        </div>
      )}
    </div>
  );
}
