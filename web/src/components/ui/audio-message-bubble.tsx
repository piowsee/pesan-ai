'use client';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { PauseIcon, PlayIcon } from 'lucide-react';
import * as React from 'react';

interface AudioMessageBubbleProps {
  audioSrc: string;
  duration?: number | null;
  bubbleColor?: string;
  waveColor?: string;
  className?: string;
  getFreshAudioSrc?: () => Promise<string>;
  metadata?: React.ReactNode;
}

function formatDuration(seconds: number | null) {
  if (!seconds || !Number.isFinite(seconds)) {
    return '0:00';
  }

  const roundedSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = roundedSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export default function AudioMessageBubble({
  audioSrc,
  duration,
  bubbleColor,
  waveColor,
  className,
  getFreshAudioSrc,
  metadata,
}: AudioMessageBubbleProps) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const isPlayingRef = React.useRef(false); // To keep track synchronously for rAF
  const isDraggingRef = React.useRef(false);
  const animationRef = React.useRef<number>(0);

  const progressTrackRef = React.useRef<HTMLDivElement>(null);
  const progressSliderRef = React.useRef<HTMLDivElement>(null);
  const thumbRef = React.useRef<HTMLDivElement>(null);
  const timeDisplayRef = React.useRef<HTMLSpanElement>(null);

  const [resolvedDuration, setResolvedDuration] = React.useState<number | null>(
    duration ?? null,
  );

  const updateProgressUI = React.useCallback((percent: number) => {
    if (progressTrackRef.current) {
      progressTrackRef.current.style.width = `${percent}%`;
    }
    progressSliderRef.current?.setAttribute(
      'aria-valuenow',
      Math.round(percent).toString(),
    );
    if (thumbRef.current) {
      // Keep it centered on the current percentage using calc
      thumbRef.current.style.left = `calc(${percent}% - 0.375rem)`;
    }
  }, []);

  const updateTimeUI = React.useCallback((time: number | null) => {
    if (timeDisplayRef.current) {
      timeDisplayRef.current.textContent = formatDuration(time);
    }
  }, []);

  React.useEffect(() => {
    const audio = new Audio(audioSrc);
    audio.preload = 'metadata';
    audioRef.current = audio;
    setIsPlaying(false);
    isPlayingRef.current = false;
    isDraggingRef.current = false;
    updateProgressUI(0);
    setResolvedDuration(duration ?? null);

    const handleLoadedMetadata = () => {
      setResolvedDuration((current) => current ?? audio.duration);
    };

    const runRenderLoop = () => {
      if (!isDraggingRef.current) {
        if (!audio.duration || !Number.isFinite(audio.duration)) {
          updateProgressUI(0);
          updateTimeUI(0);
        } else {
          updateProgressUI((audio.currentTime / audio.duration) * 100);
          updateTimeUI(audio.currentTime);
        }
      }
      if (isPlayingRef.current) {
        animationRef.current = requestAnimationFrame(runRenderLoop);
      }
    };

    const handleTimeUpdate = () => {
      // timeupdate is still useful when not playing loop (e.g., seeking while paused)
      if (!isPlayingRef.current && !isDraggingRef.current) {
        if (!audio.duration || !Number.isFinite(audio.duration)) {
          updateProgressUI(0);
          updateTimeUI(audio.duration ?? null);
        } else {
          updateProgressUI((audio.currentTime / audio.duration) * 100);
          // If paused, keep displaying the full duration base on user instruction
          updateTimeUI(audio.duration);
        }
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      isPlayingRef.current = false;
      updateProgressUI(0);
      updateTimeUI(audio.duration ?? null);
      audio.currentTime = 0;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
      isPlayingRef.current = false;
      updateTimeUI(audio.duration ?? null);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      isPlayingRef.current = true;
      updateTimeUI(audio.currentTime);
      animationRef.current = requestAnimationFrame(runRenderLoop);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      audioRef.current = null;
    };
  }, [audioSrc, duration, updateProgressUI, updateTimeUI]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      return;
    }

    if (getFreshAudioSrc) {
      const freshAudioSrc = await getFreshAudioSrc();
      if (freshAudioSrc && freshAudioSrc !== audio.src) {
        audio.src = freshAudioSrc;
        audio.load();
      }
    }

    await audio.play().catch(() => {
      setIsPlaying(false);
      isPlayingRef.current = false;
    });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio?.duration || !Number.isFinite(audio.duration)) {
      return;
    }

    isDraggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    handlePointerMove(event);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;

    const audio = audioRef.current;
    if (!audio?.duration || !Number.isFinite(audio.duration)) {
      return;
    }

    const slider = event.currentTarget;
    const rect = slider.getBoundingClientRect();
    let clickX = event.clientX - rect.left;
    clickX = Math.max(0, Math.min(clickX, rect.width));

    const percent = (clickX / rect.width) * 100;

    // Update local UI immediately for zero latency feeling
    updateProgressUI(percent);
    updateTimeUI((percent / 100) * audio.duration);

    // Update audio state
    audio.currentTime = (percent / 100) * audio.duration;
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      event.currentTarget.releasePointerCapture(event.pointerId);
      // Ensure it displays total total duration when paused if we stop dragging
      if (!isPlayingRef.current) {
        updateTimeUI(audioRef.current?.duration ?? resolvedDuration ?? null);
      }
    }
  };

  const seekByKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio?.duration || !Number.isFinite(audio.duration)) {
      return;
    }

    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }

    event.preventDefault();
    const nextTime =
      event.key === 'ArrowLeft' ? audio.currentTime - 5 : audio.currentTime + 5;
    audio.currentTime = Math.min(Math.max(nextTime, 0), audio.duration);

    if (!isPlayingRef.current) {
      updateTimeUI(audio.duration);
    } else {
      updateTimeUI(audio.currentTime);
    }
  };

  return (
    <div
      className={cn(
        'flex h-14 w-76 max-w-[calc(100vw-3rem)] items-center gap-2 bg-transparent px-2',
        className,
      )}
      style={{ backgroundColor: bubbleColor }}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 shrink-0 rounded-full bg-transparent text-brand shadow-none hover:bg-foreground/5 focus-visible:bg-foreground/5"
        onClick={togglePlay}
      >
        {isPlaying ? (
          <PauseIcon className="size-5" />
        ) : (
          <PlayIcon className="size-5 translate-x-px" />
        )}
        <span className="sr-only">
          {isPlaying ? 'Pause audio' : 'Play audio'}
        </span>
      </Button>

      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div
          ref={progressSliderRef}
          className="group/slider relative flex h-6 min-w-0 cursor-pointer items-center touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={seekByKeyboard}
          role="slider"
          aria-label="Audio progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          tabIndex={0}
        >
          {/* Track container */}
          <div className="relative h-1 w-full rounded-full bg-muted-foreground/20 transition-[height] group-hover/slider:h-1.5 group-focus-visible/slider:h-1.5">
            {/* Active track */}
            <div
              ref={progressTrackRef}
              className="absolute inset-y-0 left-0 rounded-full bg-brand/75 pointer-events-none"
              style={{
                width: `0%`,
                backgroundColor: waveColor,
              }}
            />
          </div>
          {/* Thumb (buletan) */}
          <div
            ref={thumbRef}
            className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-brand shadow-[0_1px_3px_rgba(0,0,0,0.15)] opacity-0 transition-[opacity,transform] scale-75 group-hover/slider:opacity-100 group-hover/slider:scale-100 group-focus-visible/slider:opacity-100 group-focus-visible/slider:scale-100 pointer-events-none"
            style={{
              left: `-0.375rem`,
              backgroundColor: waveColor,
            }}
          />
        </div>
        <div className="flex min-h-3 items-end justify-between gap-2">
          {!resolvedDuration ? (
            <Skeleton className="h-2.5 w-7 shrink-0 bg-muted-foreground/20" />
          ) : (
            <span
              ref={timeDisplayRef}
              className="shrink-0 font-mono text-[10px] leading-none text-muted-foreground"
            >
              {formatDuration(resolvedDuration)}
            </span>
          )}
          {metadata}
        </div>
      </div>
    </div>
  );
}
