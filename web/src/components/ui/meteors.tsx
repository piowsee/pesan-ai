'use client';

import { cn } from '@/lib/utils';
import React, { useMemo } from 'react';

interface MeteorsProps {
  number?: number;
  minDelay?: number;
  maxDelay?: number;
  minDuration?: number;
  maxDuration?: number;
  angle?: number;
  className?: string;
}

const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

export const Meteors = ({
  number = 20,
  minDelay = 0.2,
  maxDelay = 1.2,
  minDuration = 2,
  maxDuration = 10,
  angle = 215,
  className,
}: MeteorsProps) => {
  const meteorStyles = useMemo(
    () =>
      [...new Array(number)].map((_, idx) => {
        const baseSeed =
          idx * 97 +
          number * 13 +
          angle * 7 +
          minDelay * 101 +
          maxDelay * 131 +
          minDuration * 151 +
          maxDuration * 181;

        const leftRatio = seededRandom(baseSeed + 11);
        const delayRatio = seededRandom(baseSeed + 23);
        const durationRatio = seededRandom(baseSeed + 37);

        return {
          '--angle': `-${angle}deg`,
          '--delay': `${(delayRatio * (maxDelay - minDelay) + minDelay).toFixed(2)}s`,
          '--duration': `${Math.floor(durationRatio * (maxDuration - minDuration) + minDuration)}s`,
          top: '-5%',
          left: `${Math.floor(leftRatio * 100)}%`,
          animationDelay: 'var(--delay)',
          animationDuration: 'var(--duration)',
        } as React.CSSProperties;
      }),
    [number, minDelay, maxDelay, minDuration, maxDuration, angle],
  );

  return (
    <>
      {[...meteorStyles].map((style, idx) => (
        // Meteor Head
        <span
          key={idx}
          style={{ ...style }}
          className={cn(
            'animate-meteor pointer-events-none absolute size-0.5 rotate-(--angle) rounded-full bg-zinc-500 shadow-[0_0_0_1px_#ffffff10]',
            className,
          )}
        >
          {/* Meteor Tail */}
          <div className="pointer-events-none absolute top-1/2 -z-10 h-px w-12.5 -translate-y-1/2 bg-linear-to-r from-zinc-500 to-transparent" />
        </span>
      ))}
    </>
  );
};
