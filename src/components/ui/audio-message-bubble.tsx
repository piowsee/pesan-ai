'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PauseIcon, PlayIcon } from 'lucide-react';
import * as React from 'react';

interface AudioMessageBubbleProps {
  audioSrc: string;
  duration?: number | null;
  bubbleColor?: string;
  waveColor?: string;
  className?: string;
}

type WindowWithWebkitAudioContext = Window & {
  webkitAudioContext?: typeof AudioContext;
};

const waveformBarCount = 32;
const fallbackWaveformBars = Array.from({ length: waveformBarCount }, () => 12);
const waveformCache = new Map<string, Promise<WaveformData>>();

type WaveformData = {
  duration: number;
  bars: number[];
};

function getAudioContextConstructor() {
  return (
    window.AudioContext ??
    (window as WindowWithWebkitAudioContext).webkitAudioContext
  );
}

function sampleWaveform(audioBuffer: AudioBuffer, barCount = waveformBarCount) {
  const channelData = Array.from(
    { length: audioBuffer.numberOfChannels },
    (_, channelIndex) => audioBuffer.getChannelData(channelIndex),
  );
  const samplesPerBar = Math.max(1, Math.floor(audioBuffer.length / barCount));
  const amplitudes = Array.from({ length: barCount }, (_, barIndex) => {
    const start = barIndex * samplesPerBar;
    const end = Math.min(start + samplesPerBar, audioBuffer.length);
    let sumSquares = 0;
    let sampleCount = 0;

    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
      const mixedSample =
        channelData.reduce(
          (sum, channel) => sum + Math.abs(channel[sampleIndex] ?? 0),
          0,
        ) / channelData.length;
      sumSquares += mixedSample * mixedSample;
      sampleCount += 1;
    }

    return sampleCount > 0 ? Math.sqrt(sumSquares / sampleCount) : 0;
  });
  const maxAmplitude = Math.max(...amplitudes, 0.01);

  return amplitudes.map((amplitude) => {
    const normalizedAmplitude = amplitude / maxAmplitude;
    return Math.max(6, Math.round(6 + normalizedAmplitude * 22));
  });
}

async function createWaveformData(audioSrc: string): Promise<WaveformData> {
  const cachedWaveform = waveformCache.get(audioSrc);
  if (cachedWaveform) {
    return cachedWaveform;
  }

  const waveformPromise = (async () => {
    const AudioContextConstructor = getAudioContextConstructor();
    if (!AudioContextConstructor) {
      throw new Error('Audio decoding is not supported in this browser.');
    }

    const response = await fetch(audioSrc);
    if (!response.ok) {
      throw new Error('Failed to load audio waveform.');
    }

    const audioContext = new AudioContextConstructor();
    try {
      const audioBuffer = await audioContext.decodeAudioData(
        await response.arrayBuffer(),
      );

      return {
        duration: audioBuffer.duration,
        bars: sampleWaveform(audioBuffer),
      };
    } finally {
      await audioContext.close().catch(() => undefined);
    }
  })();

  waveformCache.set(audioSrc, waveformPromise);

  waveformPromise.catch(() => {
    waveformCache.delete(audioSrc);
  });

  return waveformPromise;
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

function getWaveformBarState({
  barCount,
  index,
  progress,
}: {
  barCount: number;
  index: number;
  progress: number;
}) {
  const currentBarPosition = (progress / 100) * barCount;

  if (index + 1 <= currentBarPosition) {
    return 'played';
  }

  if (index < currentBarPosition) {
    return 'current';
  }

  return 'pending';
}

export default function AudioMessageBubble({
  audioSrc,
  duration,
  bubbleColor,
  waveColor,
  className,
}: AudioMessageBubbleProps) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [resolvedDuration, setResolvedDuration] = React.useState<number | null>(
    duration ?? null,
  );
  const [waveformBars, setWaveformBars] =
    React.useState<number[]>(fallbackWaveformBars);

  React.useEffect(() => {
    let isMounted = true;

    setWaveformBars(fallbackWaveformBars);

    createWaveformData(audioSrc)
      .then((waveform) => {
        if (!isMounted) {
          return;
        }

        setWaveformBars(waveform.bars);
        setResolvedDuration((current) => current ?? waveform.duration);
      })
      .catch(() => {
        if (isMounted) {
          setWaveformBars(fallbackWaveformBars);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [audioSrc]);

  React.useEffect(() => {
    const audio = new Audio(audioSrc);
    audio.preload = 'metadata';
    audioRef.current = audio;
    setIsPlaying(false);
    setProgress(0);
    setResolvedDuration(duration ?? null);

    const handleLoadedMetadata = () => {
      setResolvedDuration((current) => current ?? audio.duration);
    };

    const handleTimeUpdate = () => {
      if (!audio.duration || !Number.isFinite(audio.duration)) {
        setProgress(0);
        return;
      }

      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      audio.currentTime = 0;
    };
    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      audioRef.current = null;
    };
  }, [audioSrc, duration]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      return;
    }

    await audio.play().catch(() => {
      setIsPlaying(false);
    });
  };

  const seekAudio = (event: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio?.duration || !Number.isFinite(audio.duration)) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    audio.currentTime = (clickX / rect.width) * audio.duration;
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
  };

  return (
    <div
      className={cn(
        'flex min-w-56 items-center gap-3 rounded-xl bg-background/50 p-3 shadow-sm',
        className,
      )}
      style={{ backgroundColor: bubbleColor }}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-9 rounded-full bg-background/80"
        onClick={togglePlay}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
        <span className="sr-only">
          {isPlaying ? 'Pause audio' : 'Play audio'}
        </span>
      </Button>

      <div
        className="relative h-8 min-w-0 flex-1 cursor-pointer overflow-hidden rounded-sm"
        onClick={seekAudio}
        onKeyDown={seekByKeyboard}
        role="slider"
        aria-label="Audio progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        tabIndex={0}
      >
        <div className="absolute inset-0 flex items-center justify-between gap-0.5 px-0.5">
          {waveformBars.map((height, index) => {
            const state = getWaveformBarState({
              barCount: waveformBars.length,
              index,
              progress,
            });
            const opacity =
              state === 'played' ? 0.9 : state === 'current' ? 0.65 : 0.28;

            return (
              <div
                key={`${height}-${index}`}
                className={cn(
                  'w-0.5 rounded-sm transition-colors duration-150',
                  state === 'played'
                    ? 'bg-foreground/70'
                    : state === 'current'
                      ? 'bg-foreground/50'
                      : 'bg-muted-foreground/25',
                )}
                style={{
                  height,
                  backgroundColor: waveColor,
                  opacity: waveColor ? opacity : undefined,
                }}
              />
            );
          })}
        </div>
      </div>

      <span className="shrink-0 font-mono text-xs text-muted-foreground">
        {formatDuration(resolvedDuration)}
      </span>
    </div>
  );
}
