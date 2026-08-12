import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { FileTextIcon, ImageIcon, MusicIcon, PlusIcon } from 'lucide-react';
import type { ChangeEventHandler } from 'react';

import type { MediaInputRefs, MediaPickerType } from '../types';
import { mediaAccept } from './media-config';

const mediaPickerOptions = [
  {
    type: 'document' as const,
    label: 'document' as const,
    icon: FileTextIcon,
    color: 'text-slate-500!',
  },
  {
    type: 'photo-video' as const,
    label: 'media' as const,
    icon: ImageIcon,
    color: 'text-violet-500!',
  },
  {
    type: 'audio' as const,
    label: 'audio' as const,
    icon: MusicIcon,
    color: 'text-pink-500!',
  },
] as const;

export function MediaPicker({
  disabled,
  inputRefs,
  onFileChange,
  onOpen,
  getLabel,
}: {
  disabled: boolean;
  inputRefs: MediaInputRefs;
  onFileChange: ChangeEventHandler<HTMLInputElement>;
  onOpen: (type: MediaPickerType) => void;
  getLabel: (key: 'attach' | 'audio' | 'document' | 'media') => string;
}) {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={disabled}
            className="size-10 shrink-0 rounded-full text-muted-foreground hover:bg-brand/10 hover:text-brand"
          >
            <PlusIcon />
            <span className="sr-only">{getLabel('attach')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="start"
          sideOffset={8}
          className="w-max min-w-0 overflow-hidden rounded-lg border bg-background p-0 text-foreground shadow-lg"
        >
          <DropdownMenuGroup className="p-2">
            {mediaPickerOptions.map((option) => {
              const Icon = option.icon;

              return (
                <DropdownMenuItem
                  key={option.type}
                  onSelect={() => onOpen(option.type)}
                  className="min-h-11 cursor-pointer gap-3 whitespace-nowrap rounded-md px-3 py-2.5 focus:bg-brand/5"
                >
                  <Icon className={cn('size-5 shrink-0', option.color)} />
                  <span className="font-medium text-foreground/80!">
                    {getLabel(option.label)}
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {(Object.keys(mediaAccept) as MediaPickerType[]).map((type) => (
        <input
          key={type}
          ref={inputRefs[type]}
          type="file"
          multiple
          accept={mediaAccept[type]}
          className="hidden"
          onChange={onFileChange}
        />
      ))}
    </>
  );
}
