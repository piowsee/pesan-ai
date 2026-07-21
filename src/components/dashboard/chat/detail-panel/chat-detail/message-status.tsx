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

  const icon = (() => {
    if (status === 'sending') {
      return (
        <Loader2Icon
          className={cn(
            'size-3.5 shrink-0 animate-spin text-muted-foreground',
            className,
          )}
          aria-label={t('sending')}
        />
      );
    }

    if (status === 'read') {
      return (
        <CheckCheckIcon
          className={cn('size-3.5 shrink-0 text-[#53bdeb]', className)}
          aria-label={t('read')}
        />
      );
    }

    if (status === 'delivered') {
      return (
        <CheckCheckIcon
          className={cn('size-3.5 shrink-0 text-muted-foreground', className)}
          aria-label={t('delivered')}
        />
      );
    }

    if (status === 'failed') {
      return (
        <AlertCircleIcon
          className={cn('size-3.5 shrink-0 text-destructive', className)}
          aria-label={t('failed')}
        />
      );
    }

    return (
      <CheckIcon
        className={cn('size-3.5 shrink-0 text-muted-foreground', className)}
        aria-label={t('sent')}
      />
    );
  })();

  return (
    <span key={status} className="inline-flex animate-in fade-in duration-300">
      {icon}
    </span>
  );
}
