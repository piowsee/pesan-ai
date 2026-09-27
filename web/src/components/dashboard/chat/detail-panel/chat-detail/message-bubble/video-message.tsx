'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useRef, useState } from 'react';

import { MessageCaption } from './message-caption';
import {
  type VisualMediaOrientation,
  getVisualMediaOrientation,
} from './message-utils';
import type { MediaRendererProps } from './types';

function VideoMessage({
  downloadUrl,
  getFreshDownloadUrl,
  isDownloadUrlStale,
  message,
  metadata,
}: MediaRendererProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [orientation, setOrientation] =
    useState<VisualMediaOrientation>('landscape');

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

  const handleLoadedMetadata = () => {
    const video = videoRef.current;

    if (video) {
      setOrientation(
        getVisualMediaOrientation(video.videoWidth, video.videoHeight),
      );
    }

    setIsLoaded(true);
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 max-w-[calc(100vw-3rem)]',
        orientation === 'portrait' ? 'w-[15.2rem]' : 'w-76',
      )}
    >
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-[5px] bg-foreground/5 min-h-32',
          orientation === 'portrait' ? 'aspect-3/4' : '',
        )}
      >
        {!isLoaded ? (
          <Skeleton className="absolute inset-0 size-full rounded-[5px]" />
        ) : null}
        <video
          controls
          preload="metadata"
          ref={videoRef}
          src={downloadUrl}
          onPointerDown={() => void refreshVideoUrlIfStale()}
          onPlay={() => void refreshVideoUrlIfStale()}
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlay={() => setIsLoaded(true)}
          onError={() => setIsLoaded(true)}
          className={cn(
            'block w-full object-cover transition-opacity duration-150',
            orientation === 'portrait'
              ? 'absolute inset-0 size-full'
              : 'h-auto',
            isLoaded ? 'opacity-100' : 'opacity-0',
          )}
        />
        {!message.content ? (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-slate-100/95 via-slate-100/70 via-50% to-slate-100/0 dark:from-slate-200/95 dark:via-slate-200/70 dark:via-50% dark:to-slate-200/0" />
            <div className="pointer-events-none absolute right-2 bottom-1.5 z-20">
              {metadata}
            </div>
          </>
        ) : null}
      </div>
      <MessageCaption content={message.content} metadata={metadata} />
    </div>
  );
}

export { VideoMessage };
