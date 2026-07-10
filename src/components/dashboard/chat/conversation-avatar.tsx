import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { ChatConversation } from '@/types/chat';
import { FaWhatsapp } from 'react-icons/fa';

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
    md: 'size-5',
    lg: 'size-5', // size-5 is good for size-12 too
  }[size];

  return (
    <div className={cn('relative shrink-0', className)}>
      <Avatar className={cn('border', avatarSize, avatarClassName)}>
        <AvatarFallback
          className={cn('text-sm font-medium', fallbackClassName)}
        >
          {conversation.displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      {conversation.messagingProduct === 'whatsapp' && (
        <div className="absolute bottom-0 right-0 flex items-center justify-center rounded-full bg-background p-[2px]">
          <FaWhatsapp className={cn('text-[#25D366]', iconSize)} />
        </div>
      )}
    </div>
  );
}
