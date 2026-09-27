'use client';

import { cn } from '@/lib/utils';
import { SearchIcon } from 'lucide-react';
import * as React from 'react';

function Command({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="command"
      className={cn(
        'flex w-full flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground',
        className,
      )}
      {...props}
    />
  );
}

function CommandInput({
  className,
  value,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<'input'>, 'value' | 'onChange'> & {
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="flex items-center gap-2 border-b px-3"
    >
      <SearchIcon className="text-muted-foreground" />
      <input
        data-slot="command-input"
        className={cn(
          'flex h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        value={value}
        onChange={(event) => onValueChange?.(event.target.value)}
        {...props}
      />
    </div>
  );
}

function CommandList({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="command-list"
      className={cn(
        'max-h-72 overflow-y-auto overflow-x-hidden p-1',
        className,
      )}
      {...props}
    />
  );
}

function CommandEmpty({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="command-empty"
      className={cn(
        'px-3 py-6 text-center text-sm text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

function CommandGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="command-group"
      className={cn('flex flex-col gap-1', className)}
      {...props}
    />
  );
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="command-separator"
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  );
}

function CommandItem({
  className,
  onSelect,
  ...props
}: Omit<React.ComponentProps<'button'>, 'onSelect'> & {
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      data-slot="command-item"
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      onClick={onSelect}
      {...props}
    />
  );
}

export {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
};
