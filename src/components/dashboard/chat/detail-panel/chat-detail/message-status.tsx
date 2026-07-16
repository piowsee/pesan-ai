import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types/chat';
import {
  AlertCircleIcon,
  CheckCheckIcon,
  CheckIcon,
  Loader2Icon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

export function MessageStatus({
  status,
  className,
}: {
  status: ChatMessage['status'] | 'sending';
  className?: string;
}) {
  const t = useTranslations('Chat.status');
  if (status === 'sending') {
    return (
      <Loader2Icon
        className={cn('size-3.5 animate-spin text-muted-foreground', className)}
        aria-label={t('sending')}
      />
    );
  }

  if (status === 'read') {
    return (
      <CheckCheckIcon
        className={cn('size-3.5 text-brand', className)}
        aria-label={t('read')}
      />
    );
  }

  if (status === 'delivered') {
    return (
      <CheckCheckIcon
        className={cn('size-3.5 text-muted-foreground', className)}
        aria-label={t('delivered')}
      />
    );
  }

  if (status === 'failed') {
    return (
      <AlertCircleIcon
        className={cn('size-3.5 text-destructive', className)}
        aria-label={t('failed')}
      />
    );
  }

  return (
    <CheckIcon
      className={cn('size-3.5 text-muted-foreground', className)}
      aria-label={t('sent')}
    />
  );
}
