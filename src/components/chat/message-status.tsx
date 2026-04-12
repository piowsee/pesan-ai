import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types/chat';
import {
  AlertCircleIcon,
  CheckCheckIcon,
  CheckIcon,
  Loader2Icon,
} from 'lucide-react';

export function MessageStatus({
  status,
  className,
}: {
  status: ChatMessage['status'] | 'sending';
  className?: string;
}) {
  if (status === 'sending') {
    return (
      <Loader2Icon
        className={cn('size-3.5 animate-spin text-muted-foreground', className)}
        aria-label="Sending"
      />
    );
  }

  if (status === 'read') {
    return (
      <CheckCheckIcon
        className={cn('size-3.5 text-sky-500', className)}
        aria-label="Read"
      />
    );
  }

  if (status === 'delivered') {
    return (
      <CheckCheckIcon
        className={cn('size-3.5 text-muted-foreground', className)}
        aria-label="Delivered"
      />
    );
  }

  if (status === 'failed') {
    return (
      <AlertCircleIcon
        className={cn('size-3.5 text-destructive', className)}
        aria-label="Failed"
      />
    );
  }

  return (
    <CheckIcon
      className={cn('size-3.5 text-muted-foreground', className)}
      aria-label="Sent"
    />
  );
}
