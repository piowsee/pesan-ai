import { cn } from '@/lib/utils';
import { LoaderCircleIcon } from 'lucide-react';
import * as React from 'react';

function Spinner({
  className,
  ...props
}: React.ComponentProps<typeof LoaderCircleIcon>) {
  return (
    <LoaderCircleIcon
      data-slot="spinner"
      className={cn('animate-spin text-muted-foreground', className)}
      {...props}
    />
  );
}

export { Spinner };
