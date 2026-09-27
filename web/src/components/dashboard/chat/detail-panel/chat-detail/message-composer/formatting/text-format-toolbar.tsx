import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  BoldIcon,
  Code2Icon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  type LucideIcon,
  QuoteIcon,
  StrikethroughIcon,
  XIcon,
} from 'lucide-react';

import type { WhatsAppTextFormat } from '../../whatsapp-text';
import type { TextFormatLabelKey } from '../types';

const textFormatOptions = [
  { format: 'bold', labelKey: 'formatBold', icon: BoldIcon },
  { format: 'italic', labelKey: 'formatItalic', icon: ItalicIcon },
  {
    format: 'strikethrough',
    labelKey: 'formatStrikethrough',
    icon: StrikethroughIcon,
  },
  { format: 'inline-code', labelKey: 'formatCode', icon: Code2Icon },
  {
    format: 'bulleted-list',
    labelKey: 'formatBulletedList',
    icon: ListIcon,
  },
  {
    format: 'numbered-list',
    labelKey: 'formatNumberedList',
    icon: ListOrderedIcon,
  },
  { format: 'quote', labelKey: 'formatQuote', icon: QuoteIcon },
] satisfies {
  format: WhatsAppTextFormat;
  labelKey: TextFormatLabelKey;
  icon: LucideIcon;
}[];

export function TextFormatToolbar({
  disabled,
  activeFormats,
  getLabel,
  onClose,
  onFormat,
}: {
  disabled: boolean;
  activeFormats: Set<WhatsAppTextFormat>;
  getLabel: (key: TextFormatLabelKey) => string;
  onClose: () => void;
  onFormat: (format: WhatsAppTextFormat) => void;
}) {
  return (
    <div className="absolute bottom-full left-4 z-20 mb-2 flex animate-in fade-in-0 slide-in-from-bottom-2 zoom-in-95 items-center gap-3 rounded-full border border-border/70 bg-background/95 px-2.5 py-2 text-foreground shadow-lg backdrop-blur-md duration-150">
      <div className="flex items-center gap-0.5">
        {textFormatOptions.map((option) => {
          const Icon = option.icon;
          return (
            <Tooltip key={option.format}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  disabled={disabled}
                  aria-label={getLabel(option.labelKey)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onFormat(option.format)}
                  className={cn(
                    'rounded-full',
                    activeFormats.has(option.format)
                      ? 'bg-brand/10 text-brand hover:bg-brand/20 hover:text-brand'
                      : 'text-muted-foreground hover:bg-brand/10 hover:text-brand',
                  )}
                >
                  <Icon />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>
                {getLabel(option.labelKey)}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <div className="h-5 w-px bg-border" aria-hidden="true" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={getLabel('closeFormatToolbar')}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClose}
            className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>
          {getLabel('closeFormatToolbar')}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
