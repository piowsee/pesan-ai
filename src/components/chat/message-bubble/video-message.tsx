'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useRef, useState } from 'react';

import { MessageCaption } from './message-caption';
import type { MediaRendererProps } from './types';

function VideoMessage({
  downloadUrl,
  getFreshDownloadUrl,
  isDownloadUrlStale,
  message,
}: MediaRendererProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshVideoUrlIfStale = async () => {
    if (!isDownloadUrlStale || !getFreshDownloadUrl) {
      return;
    }

    const freshUrl = await getFreshDownloadUrl();
    const video = videoRef.current;
    if (video && freshUrl !== video.currentSrc) {
      setIsLoaded(false);
      video.src = freshUrl;
      video.load();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative min-w-56 overflow-hidden rounded-xl bg-background/50">
        {!isLoaded ? (
          <Skeleton className="aspect-video max-h-80 w-full rounded-xl" />
        ) : null}
        <video
          controls
          preload="metadata"
          ref={videoRef}
          src={downloadUrl}
          onPointerDown={() => void refreshVideoUrlIfStale()}
          onPlay={() => void refreshVideoUrlIfStale()}
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
