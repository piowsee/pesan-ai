import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

type PublicContainerProps = {
  children: ReactNode;
  className?: string;
};

export function Container({ children, className }: PublicContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[1220px] px-5 sm:px-8 lg:px-14',
        className,
      )}
    >
      {children}
    </div>
  );
}
