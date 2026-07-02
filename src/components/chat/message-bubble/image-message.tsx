'use client';

import { Skeleton } from '@/components/ui/skeleton';
import type { MouseEvent } from 'react';
import { useState } from 'react';

import { MessageCaption } from './message-caption';
import type { MediaRendererProps } from './types';

function ImageMessage({
  downloadUrl,
  getFreshDownloadUrl,
  isDownloadUrlStale,
  message,
}: MediaRendererProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const alt = message.content || message.mediaFilename || 'Image message';

  const handleOpenImage = async (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isDownloadUrlStale || !getFreshDownloadUrl) {
      return;
    }

    event.preventDefault();
    const targetWindow = window.open('', '_blank', 'noopener,noreferrer');
    const freshUrl = await getFreshDownloadUrl();

    if (targetWindow) {
      targetWindow.location.href = freshUrl;
      return;
    }

    window.location.href = freshUrl;
  };

  return (
    <div className="flex flex-col gap-2">
      <a
        href={downloadUrl}
        target="_blank"
        rel="noreferrer"
        onClick={handleOpenImage}
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
