import * as React from 'react';

// ============================================================================

interface CountdownOptions {
  countStart: number;
  intervalMs?: number;
  isIncrement?: boolean;
  countStop?: number;
}

interface CountdownControllers {
  startCountdown: () => void;
  stopCountdown: () => void;
  resetCountdown: () => void;
}

export type UseCountdownReturn = [number, CountdownControllers];

export function useCountdown({
  countStart,
  countStop = 0,
  intervalMs = 1000,
  isIncrement = false,
}: CountdownOptions): UseCountdownReturn {
  const [count, setCount] = React.useState(countStart);
  const [isRunning, setIsRunning] = React.useState(false);
  const savedCallback = React.useRef<() => void>(undefined);

  const increment = React.useCallback(() => setCount((x) => x + 1), []);
  const decrement = React.useCallback(() => setCount((x) => x - 1), []);
  const resetCount = React.useCallback(
    () => setCount(countStart),
    [countStart],
  );

  const startCountdown = React.useCallback(() => setIsRunning(true), []);
  const stopCountdown = React.useCallback(() => setIsRunning(false), []);

  const resetCountdown = React.useCallback(() => {
    setIsRunning(false);
    resetCount();
  }, [resetCount]);

  const countdownCallback = React.useCallback(() => {
    if (count === countStop) {
      setIsRunning(false);
      return;
    }
    if (isIncrement) {
      increment();
    } else {
      decrement();
    }
  }, [count, countStop, decrement, increment, isIncrement]);

  // Store callback in ref
  React.useEffect(() => {
    savedCallback.current = countdownCallback;
  }, [countdownCallback]);

  // Set up interval
  React.useEffect(() => {
    if (!isRunning) {
      return;
    }

    const tick = () => savedCallback.current?.();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [isRunning, intervalMs]);

  return [count, { startCountdown, stopCountdown, resetCountdown }];
}

export type { CountdownOptions, CountdownControllers };

// ============================================================================
