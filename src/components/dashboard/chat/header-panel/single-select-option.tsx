import { cn } from '@/lib/utils';
import { CheckIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function SingleSelectOption({
  description,
  icon,
  isSelected,
  label,
  onSelect,
}: {
  description?: string;
  icon: ReactNode;
  isSelected: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
      className={cn(
        'grid min-h-12 w-full cursor-pointer grid-cols-[1rem_minmax(0,1fr)_1rem] items-center gap-3 rounded-md px-3 py-2.5 text-left text-foreground/60 transition-colors hover:bg-brand/5 hover:text-brand focus-visible:bg-brand/5 focus-visible:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/80',
        isSelected && 'bg-brand/10 text-brand hover:bg-brand/10',
      )}
    >
      <span className="flex size-4 items-center justify-center">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{label}</span>
        {description ? (
          <span className="block truncate text-xs text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
      {isSelected ? (
        <span className="flex size-4 items-center justify-center rounded-full bg-brand text-brand-foreground">
          <CheckIcon className="size-2.5" />
        </span>
      ) : null}
    </button>
  );
}
