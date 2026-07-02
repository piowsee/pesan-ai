import { Skeleton } from '@/components/ui/skeleton';

import type { MediaMessageType } from './types';

function DocumentMessageSkeleton() {
  return (
    <div className="flex min-w-60 items-center gap-3 rounded-xl bg-background/50 p-3">
      <Skeleton className="size-9 shrink-0 rounded-lg" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-40 max-w-full" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

function AudioMessageSkeleton() {
  return (
    <div className="flex min-w-64 items-center gap-3 rounded-xl bg-background/50 p-3">
      <Skeleton className="size-9 shrink-0 rounded-full" />
      <div className="flex h-8 min-w-0 flex-1 items-center justify-between gap-0.5 px-0.5">
        {Array.from({ length: 32 }).map((_, index) => (
          <Skeleton
            key={index}
            className="w-0.5 rounded-sm"
            style={{ height: `${8 + (index % 5) * 4}px` }}
          />
        ))}
      </div>
      <Skeleton className="h-3 w-8 shrink-0" />
    </div>
  );
}

function VisualMediaMessageSkeleton({ type }: { type: 'image' | 'video' }) {
  return (
    <div className="relative min-w-56 overflow-hidden rounded-xl bg-background/50">
      <Skeleton className="aspect-video max-h-80 w-full rounded-xl" />
      {type === 'video' ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Skeleton className="size-12 rounded-full" />
        </div>
      ) : null}
    </div>
  );
}

function MediaMessageSkeleton({ type }: { type: MediaMessageType }) {
  if (type === 'document') {
    return <DocumentMessageSkeleton />;
  }

  if (type === 'audio') {
    return <AudioMessageSkeleton />;
  }

  return <VisualMediaMessageSkeleton type={type} />;
}

export { MediaMessageSkeleton };
