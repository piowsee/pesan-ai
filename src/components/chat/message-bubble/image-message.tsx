'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

import { MessageCaption } from './message-caption';
import type { MediaRendererProps } from './types';

function ImageMessage({ downloadUrl, message }: MediaRendererProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const alt = message.content || message.mediaFilename || 'Image message';

  return (
    <div className="flex flex-col gap-2">
      <a
        href={downloadUrl}
        target="_blank"
        rel="noreferrer"
        className="relative block min-w-56 overflow-hidden rounded-xl bg-background/50"
      >
        {!isLoaded ? (
          <Skeleton className="aspect-video max-h-80 w-full rounded-xl" />
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element -- Presigned object-storage URLs are dynamic and may come from different storage hosts. */}
        <img
          src={downloadUrl}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => setIsLoaded(true)}
          className={
            isLoaded
              ? 'max-h-80 w-full object-cover'
              : 'absolute inset-0 size-full opacity-0'
          }
        />
      </a>
      <MessageCaption content={message.content} />
    </div>
  );
}

export { ImageMessage };
