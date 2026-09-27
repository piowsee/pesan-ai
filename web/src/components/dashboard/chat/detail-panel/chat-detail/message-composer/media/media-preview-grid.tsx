import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { XIcon } from 'lucide-react';

import { getDocumentVisual } from '../../message-bubble/document-message';
import type { SelectedMedia } from '../types';
import { formatFileSize } from './media-utils';

export function MediaPreviewGrid({
  selectedMedia,
  onRemove,
  removeAriaLabel,
  captionTargetIndex,
  onSelectCaptionTarget,
}: {
  selectedMedia: SelectedMedia[];
  onRemove: (index: number) => void;
  removeAriaLabel: string;
  captionTargetIndex: number;
  onSelectCaptionTarget: (index: number) => void;
}) {
  if (selectedMedia.length === 0) return null;

  return (
    <div className="mx-4 mb-2 grid max-h-[30vh] grid-cols-2 gap-2 overflow-y-auto pt-px pr-1 pb-px pl-px sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5 [scrollbar-color:hsl(var(--border))_transparent] [scrollbar-width:thin]">
      {selectedMedia.map((media, index) => {
        const { file, previewUrl } = media;
        const visual = getDocumentVisual({
          mediaFilename: file.name,
          mediaMimeType: file.type,
        });
        const IconComponent = visual.Icon;

        return (
          <div
            key={`${file.name}-${index}`}
            role="button"
            tabIndex={0}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelectCaptionTarget(index)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelectCaptionTarget(index);
              }
            }}
            className={cn(
              'group relative flex h-14 cursor-pointer items-center gap-2.5 overflow-hidden rounded-xl border border-border p-2 shadow-sm transition-colors',
              captionTargetIndex === index
                ? 'bg-muted-foreground/15'
                : 'bg-background/95 hover:bg-muted',
            )}
          >
            <div className="relative flex shrink-0 items-center justify-center">
              {file.type.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element -- Local object URLs cannot be optimized.
                <img
                  src={previewUrl}
                  alt={file.name}
                  className="size-10 rounded-lg object-cover"
                />
              ) : file.type.startsWith('video/') ? (
                <video
                  src={previewUrl}
                  className="size-10 rounded-lg object-cover"
                  muted
                />
              ) : (
                <IconComponent
                  className={cn('size-7', visual.colorClassName)}
                />
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-xs font-medium text-foreground">
                {file.name}
              </span>
              <span className="truncate text-[10px] text-muted-foreground">
                {visual.label} • {formatFileSize(file.size)}
              </span>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mr-0.5 size-7 shrink-0 rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-transparent hover:text-muted-foreground group-hover:opacity-100"
              onClick={(event) => {
                event.stopPropagation();
                onRemove(index);
              }}
              title={removeAriaLabel}
            >
              <XIcon className="size-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
