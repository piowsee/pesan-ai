'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

import { MessageCaption } from './message-caption';
import type { MediaRendererProps } from './types';

function VideoMessage({ downloadUrl, message }: MediaRendererProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative min-w-56 overflow-hidden rounded-xl bg-background/50">
        {!isLoaded ? (
          <Skeleton className="aspect-video max-h-80 w-full rounded-xl" />
        ) : null}
        <video
          controls
          preload="metadata"
          src={downloadUrl}
          onLoadedMetadata={() => setIsLoaded(true)}
          onCanPlay={() => setIsLoaded(true)}
          onError={() => setIsLoaded(true)}
          className={
            isLoaded
              ? 'aspect-video max-h-80 w-full rounded-xl bg-background/50'
              : 'absolute inset-0 size-full opacity-0'
          }
        />
      </div>
      <MessageCaption content={message.content} />
    </div>
  );
}

export { VideoMessage };
