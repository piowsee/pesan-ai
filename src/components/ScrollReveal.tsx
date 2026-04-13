'use client';

import { cn } from '@/lib/utils';
import { type ReactNode, useEffect, useRef, useState } from 'react';

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
  onRevealComplete?: () => void;
};

export function ScrollReveal({
  children,
  className,
  delay = 0,
  distance = 28,
  onRevealComplete,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const hasNotifiedCompleteRef = useRef(false);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -10% 0px',
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isVisible || hasNotifiedCompleteRef.current || !onRevealComplete) {
      return;
    }

    const timeout = window.setTimeout(() => {
      hasNotifiedCompleteRef.current = true;
      onRevealComplete();
    }, delay + 700);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [delay, isVisible, onRevealComplete]);

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out will-change-transform',
        isVisible ? 'translate-y-0 opacity-100' : 'opacity-0',
        className,
      )}
      style={{
        transform: isVisible ? 'translateY(0px)' : `translateY(${distance}px)`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
