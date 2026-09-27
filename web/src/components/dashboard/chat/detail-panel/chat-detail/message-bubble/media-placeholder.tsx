import type { LucideIcon } from 'lucide-react';

function MediaPlaceholder({
  description,
  icon: Icon,
  title,
}: {
  description: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <div className="flex h-14 w-[19rem] max-w-[calc(100vw-3rem)] items-center gap-2.5 bg-transparent px-2 pb-3 text-sm">
      <Icon className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="truncate font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export { MediaPlaceholder };
