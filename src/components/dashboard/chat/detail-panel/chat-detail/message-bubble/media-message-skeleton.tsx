import { Skeleton } from '@/components/ui/skeleton';
import type { ReactNode } from 'react';

import type { MediaMessageType } from './types';

function DocumentMessageSkeleton({ metadata }: { metadata: ReactNode }) {
  return (
    <div className="flex h-14 w-[19rem] max-w-[calc(100vw-3rem)] items-center gap-2.5 bg-transparent px-2">
      <Skeleton className="size-7 shrink-0 rounded-sm" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Skeleton className="h-3.5 w-36 max-w-full" />
        <div className="flex items-end justify-between gap-2">
          <Skeleton className="h-2.5 w-16" />
          {metadata}
        </div>
      </div>
    </div>
  );
}

function AudioMessageSkeleton({ metadata }: { metadata: ReactNode }) {
  return (
    <div className="flex h-14 w-[19rem] max-w-[calc(100vw-3rem)] items-center gap-2 bg-transparent px-2">
      <Skeleton className="size-8 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <div className="flex h-5 items-center px-0.5">
          <Skeleton className="h-1 w-full rounded-full" />
        </div>
        <div className="flex items-end justify-between gap-2">
          <Skeleton className="h-2.5 w-7" />
          {metadata}
        </div>
      </div>
    </div>
  );
}

function VisualMediaMessageSkeleton({
  metadata,
  type,
}: {
  metadata: ReactNode;
  type: 'image' | 'video';
}) {
  return (
    <div className="relative aspect-[16/10] w-[19rem] max-w-[calc(100vw-3rem)] overflow-hidden rounded-[7px] bg-foreground/5">
      <Skeleton className="absolute inset-0 size-full rounded-[7px]" />
      {type === 'video' ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Skeleton className="size-9 rounded-full" />
        </div>
      ) : null}
      {metadata ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-9 bg-gradient-to-t from-slate-100/95 via-slate-100/60 to-slate-100/30 dark:from-slate-200/90 dark:via-slate-200/55 dark:to-slate-200/30" />
          <div className="pointer-events-none absolute right-2 bottom-1.5 z-20">
            {metadata}
          </div>
        </>
      ) : null}
    </div>
  );
}

function MediaMessageSkeleton({
  metadata,
  type,
}: {
  metadata: ReactNode;
  type: MediaMessageType;
}) {
  if (type === 'document') {
    return <DocumentMessageSkeleton metadata={metadata} />;
  }

  if (type === 'audio') {
    return <AudioMessageSkeleton metadata={metadata} />;
  }

  return <VisualMediaMessageSkeleton type={type} metadata={metadata} />;
}

export { MediaMessageSkeleton };
