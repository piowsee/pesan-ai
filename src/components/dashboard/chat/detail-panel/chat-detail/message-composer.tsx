'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CHAT_MESSAGE_CHARACTER_LIMIT } from '@/lib/chat/chat';
import { cn } from '@/lib/utils';
import type { ChatConversation } from '@/types/chat';
import {
  BoldIcon,
  Code2Icon,
  FileTextIcon,
  ImageIcon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  type LucideIcon,
  MusicIcon,
  PlusIcon,
  QuoteIcon,
  SendHorizontalIcon,
  StrikethroughIcon,
  XIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import {
  type WhatsAppTextFormat,
  findInlineFormat,
  hasUnbalancedFormattingMarker,
} from './whatsapp-text';

function isCodeFenceStart(line: string) {
  return line.trimStart().startsWith('```');
}

function isBulletLine(line: string) {
  return /^\s{0,3}[-*]\s+/.test(line);
}

function isNumberedLine(line: string) {
  return /^\s{0,3}\d{1,2}\.\s+/.test(line);
}

function isQuoteLine(line: string) {
  return /^\s{0,3}>\s+/.test(line);
}

/**
 * Render inline WhatsApp formatting within a single text flow.
 * Absolute layout neutrality ensures the overlay matches the textarea exactly.
 */
function renderInlineComposerText(
  text: string,
  keyPrefix: string,
): ReactNode[] {
  const nodes: ReactNode[] = [];

  if (hasUnbalancedFormattingMarker(text)) {
    nodes.push(text);
    return nodes;
  }

  let remaining = text;
  let offset = 0;

  while (remaining) {
    const match = findInlineFormat(remaining);

    if (!match) {
      nodes.push(remaining);
      break;
    }

    if (match.start > 0) {
      nodes.push(remaining.slice(0, match.start));
    }

    const contentStart = match.start + match.marker.length;
    const content = remaining.slice(contentStart, match.end);
    const formatKey = `${keyPrefix}-${offset}-${match.type}`;
    const markerStart = (
      <span key={`${formatKey}-ms`} className="text-brand/70">
        {match.marker}
      </span>
    );
    const markerEnd = (
      <span key={`${formatKey}-me`} className="text-brand/70">
        {match.marker}
      </span>
    );

    const innerNodes = renderInlineComposerText(content, formatKey);

    if (match.type === 'bold') {
      nodes.push(markerStart);
      // Faux-bold using CSS text-shadow to prevent font-weight from altering layout width
      nodes.push(
        <span
          key={formatKey}
          className="text-foreground/90 font-normal"
          style={{
            textShadow: '0.4px 0 0 currentColor, -0.1px 0 0 currentColor',
          }}
        >
          {innerNodes}
        </span>,
      );
      nodes.push(markerEnd);
    } else if (match.type === 'italic') {
      nodes.push(markerStart);
      nodes.push(
        <em key={formatKey} className="italic text-foreground/90">
          {innerNodes}
        </em>,
      );
      nodes.push(markerEnd);
    } else if (match.type === 'strikethrough') {
      nodes.push(markerStart);
      nodes.push(
        <del key={formatKey} className="line-through text-foreground/70">
          {innerNodes}
        </del>,
      );
      nodes.push(markerEnd);
    } else {
      nodes.push(markerStart);
      // Layout-neutral code wrapping: no padding, margin, or font weight changes
      nodes.push(
        <span
          key={formatKey}
          className="rounded bg-foreground/10 text-brand font-normal"
        >
          {content}
        </span>,
      );
      nodes.push(markerEnd);
    }

    const nextIndex = match.end + match.marker.length;
    offset += nextIndex;
    remaining = remaining.slice(nextIndex);
  }

  return nodes;
}

type MediaPickerType = 'audio' | 'document' | 'photo-video';
type TextFormatLabelKey =
  | 'closeFormatToolbar'
  | 'formatBold'
  | 'formatBulletedList'
  | 'formatCode'
  | 'formatItalic'
  | 'formatNumberedList'
  | 'formatQuote'
  | 'formatStrikethrough';

type SelectedMedia = {
  file: File;
  previewUrl: string;
};

type SendMediaMessageInput = {
  file: File;
  caption?: string;
};

const documentAccept = [
  'text/plain',
  'application/pdf',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
].join(',');

const photoVideoAccept = [
  'image/jpeg',
  'image/png',
  'video/3gpp',
  'video/mp4',
].join(',');

const audioAccept = [
  'audio/aac',
  'audio/amr',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
].join(',');

const mediaPickerOptions = [
  {
    type: 'document' as const,
    label: 'Document',
    icon: FileTextIcon,
  },
  {
    type: 'photo-video' as const,
    label: 'Photos & videos',
    icon: ImageIcon,
  },
  {
    type: 'audio' as const,
    label: 'Audio',
    icon: MusicIcon,
  },
];

const textFormatOptions = [
  {
    format: 'bold',
    labelKey: 'formatBold',
    icon: BoldIcon,
  },
  {
    format: 'italic',
    labelKey: 'formatItalic',
    icon: ItalicIcon,
  },
  {
    format: 'strikethrough',
    labelKey: 'formatStrikethrough',
    icon: StrikethroughIcon,
  },
  {
    format: 'inline-code',
    labelKey: 'formatCode',
    icon: Code2Icon,
  },
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
  {
    format: 'quote',
    labelKey: 'formatQuote',
    icon: QuoteIcon,
  },
] satisfies {
  format: WhatsAppTextFormat;
  labelKey: TextFormatLabelKey;
  icon: LucideIcon;
}[];

function formatFileSize(size: number) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)}${units[unitIndex]}`;
}

function getFileTypeLabel(file: File) {
  const extension = file.name.split('.').pop()?.trim();

  if (extension && extension !== file.name) {
    return extension.toUpperCase();
  }

  if (file.type.startsWith('image/')) return 'IMAGE';
  if (file.type.startsWith('audio/')) return 'AUDIO';
  if (file.type.startsWith('video/')) return 'VIDEO';

  return 'FILE';
}

function MediaPreview({
  selectedMedia,
  onRemove,
  removeAriaLabel,
}: {
  selectedMedia: SelectedMedia;
  onRemove: () => void;
  removeAriaLabel: string;
}) {
  const { file, previewUrl } = selectedMedia;
  const description = `${formatFileSize(file.size)} · ${getFileTypeLabel(file)}`;

  return (
    <div className="mx-4 mb-2 rounded-2xl border border-brand/15 bg-background/95 p-3 shadow-sm backdrop-blur-sm">
      <div className="flex items-start gap-3">
        {file.type.startsWith('image/') ? (
          // eslint-disable-next-line @next/next/no-img-element -- Local object URLs cannot be optimized by next/image.
          <img
            src={previewUrl}
            alt={file.name}
            className="size-16 rounded-xl object-cover"
          />
        ) : file.type.startsWith('video/') ? (
          <video
            src={previewUrl}
            className="size-16 rounded-xl bg-muted object-cover"
            muted
          />
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-muted">
            {file.type.startsWith('audio/') ? (
              <MusicIcon className="size-6 text-muted-foreground" />
            ) : (
              <FileTextIcon className="size-6 text-muted-foreground" />
            )}
          </div>
        )}

        <div className="min-w-0 flex-1 pt-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
          {file.type.startsWith('audio/') ? (
            <audio
              controls
              preload="metadata"
              src={previewUrl}
              className="mt-2 w-full"
            />
          ) : null}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="size-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
        >
          <XIcon />
          <span className="sr-only">{removeAriaLabel}</span>
        </Button>
      </div>
    </div>
  );
}

function TextFormatToolbar({
  disabled,
  activeFormats,
  getLabel,
  onCloseAction,
  onFormatAction,
}: {
  disabled: boolean;
  activeFormats: Set<WhatsAppTextFormat>;
  getLabel: (key: TextFormatLabelKey) => string;
  onCloseAction: () => void;
  onFormatAction: (format: WhatsAppTextFormat) => void;
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
                  onClick={() => onFormatAction(option.format)}
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
            onClick={onCloseAction}
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

function getCurrentLine(value: string, cursor: number) {
  const lineStart = value.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1;
  const lineEndCandidate = value.indexOf('\n', cursor);
  const lineEnd = lineEndCandidate === -1 ? value.length : lineEndCandidate;

  return {
    line: value.slice(lineStart, lineEnd),
    lineStart,
    lineEnd,
  };
}

function getContinuedLinePrefix(line: string) {
  const bulletMatch = /^(\s{0,3})([-*])\s+(.*)$/.exec(line);
  if (bulletMatch) {
    return bulletMatch[3]?.trim() ? `${bulletMatch[1]}${bulletMatch[2]} ` : '';
  }

  const numberedMatch = /^(\s{0,3})(\d{1,2})\.\s+(.*)$/.exec(line);
  if (numberedMatch) {
    const nextNumber = Number(numberedMatch[2]) + 1;
    return numberedMatch[3]?.trim() ? `${numberedMatch[1]}${nextNumber}. ` : '';
  }

  const quoteMatch = /^(\s{0,3}>\s+)(.*)$/.exec(line);
  if (quoteMatch) {
    return quoteMatch[2]?.trim() ? quoteMatch[1] : '';
  }

  return null;
}

function getActiveFormats(
  value: string,
  cursorStart: number,
  cursorEnd: number,
): Set<WhatsAppTextFormat> {
  const active = new Set<WhatsAppTextFormat>();
  if (!value) return active;

  const selectedText = value.slice(cursorStart, cursorEnd);

  const checkInline = (marker: string, format: WhatsAppTextFormat) => {
    const lineStart = value.lastIndexOf('\n', Math.max(0, cursorStart - 1)) + 1;
    const lineEndCandidate = value.indexOf('\n', cursorEnd);
    const lineEnd = lineEndCandidate === -1 ? value.length : lineEndCandidate;

    const beforeText = value.slice(lineStart, cursorStart);
    const afterText = value.slice(cursorEnd, lineEnd);
    const beforeCount = beforeText.split(marker).length - 1;
    const afterCount = afterText.split(marker).length - 1;

    let stripped = selectedText;
    let hasInner = false;
    let changed = true;
    while (changed && !hasInner) {
      changed = false;
      for (const m of ['*', '_', '~', '`']) {
        if (
          stripped.length >= 2 &&
          stripped.startsWith(m) &&
          stripped.endsWith(m)
        ) {
          if (m === marker) {
            hasInner = true;
          }
          stripped = stripped.slice(m.length, -m.length);
          changed = true;
        }
      }
    }

    if ((beforeCount % 2 === 1 && afterCount % 2 === 1) || hasInner) {
      active.add(format);
    }
  };

  checkInline('*', 'bold');
  checkInline('_', 'italic');
  checkInline('~', 'strikethrough');
  checkInline('`', 'inline-code');

  const targetStart = value.lastIndexOf('\n', Math.max(0, cursorStart - 1)) + 1;
  const nextNewlineIndex = value.indexOf('\n', cursorEnd);
  const targetEnd = nextNewlineIndex === -1 ? value.length : nextNewlineIndex;

  if (targetStart < value.length) {
    const rawLinesText = value.slice(targetStart, targetEnd);
    const lines = rawLinesText.split('\n');
    let allBullet = true;
    let allNumbered = true;
    let allQuote = true;

    for (const line of lines) {
      if (!/^(\s{0,3})([-*])\s+/.test(line)) allBullet = false;
      if (!/^(\s{0,3})(\d{1,2}\.)\s+/.test(line)) allNumbered = false;
      if (!/^(\s{0,3})>\s+/.test(line)) allQuote = false;
    }

    if (lines.length > 0) {
      if (allBullet) active.add('bulleted-list');
      if (allNumbered) active.add('numbered-list');
      if (allQuote) active.add('quote');
    }
  }

  return active;
}

export function MessageComposer({
  conversation,
  onSendAction,
  onSendMediaAction,
}: {
  conversation: ChatConversation;
  onSendAction: (content: string) => void;
  onSendMediaAction: (input: SendMediaMessageInput) => void;
}) {
  const t = useTranslations('Chat.composer');
  const [draft, setDraft] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(
    null,
  );
  const [selectionRange, setSelectionRange] = useState<[number, number]>([
    0, 0,
  ]);
  const [isFormatToolbarDismissed, setIsFormatToolbarDismissed] =
    useState(false);
  const [isBlockToolbarDismissed, setIsBlockToolbarDismissed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const photoVideoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (selectedMedia) {
        URL.revokeObjectURL(selectedMedia.previewUrl);
      }
    };
  }, [selectedMedia]);

  const syncOverlayScroll = () => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const isSelectionActive = selectionRange[0] !== selectionRange[1];

  const resizeTextarea = (target?: HTMLTextAreaElement | null) => {
    const element = target ?? textareaRef.current;
    if (!element) {
      return;
    }

    const maxHeightPx = 128;
    element.style.height = 'auto';
    const nextHeight = Math.min(element.scrollHeight, maxHeightPx);
    element.style.height = `${nextHeight}px`;
    element.style.overflowY =
      element.scrollHeight > maxHeightPx ? 'auto' : 'hidden';

    if (element.selectionStart === element.value.length) {
      element.scrollTop = element.scrollHeight;
    }
    syncOverlayScroll();
  };

  const resetTextarea = () => {
    if (!textareaRef.current) {
      return;
    }
    textareaRef.current.style.height = '40px';
    textareaRef.current.style.overflowY = 'hidden';
  };

  useEffect(() => {
    syncOverlayScroll();
  }, [draft]);

  useEffect(() => {
    resetTextarea();
  }, [conversation.id]);

  const clearSelectedMedia = () => {
    setSelectedMedia((current) => {
      if (current) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return null;
    });
  };

  const resetComposer = () => {
    setDraft('');
    setIsFormatToolbarDismissed(false);
    setIsBlockToolbarDismissed(false);
    clearSelectedMedia();
    resetTextarea();
  };

  const applyTextFormat = (format: WhatsAppTextFormat) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.focus();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    // For list/quote (block) formatting
    if (
      format === 'bulleted-list' ||
      format === 'numbered-list' ||
      format === 'quote'
    ) {
      // Find boundaries of complete lines intersecting the selection range
      const targetStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
      const nextNewlineIndex = value.indexOf('\n', end);
      const targetEnd =
        nextNewlineIndex === -1 ? value.length : nextNewlineIndex;

      const rawLinesText = value.slice(targetStart, targetEnd);
      const lines = rawLinesText.split('\n');

      const modifiedLines = lines.map((line, i) => {
        const bulletRegex = /^(\s{0,3})([-*])\s+/;
        const numberedRegex = /^(\s{0,3})(\d{1,2}\.)\s+/;
        const quoteRegex = /^(\s{0,3})>\s+/;

        const isBullet = bulletRegex.exec(line);
        const isNumbered = numberedRegex.exec(line);
        const isQuote = quoteRegex.exec(line);

        let prefixType = '';
        let content = line;

        if (isBullet) {
          prefixType = 'bullet';
          content = line.slice(isBullet[0].length);
        } else if (isNumbered) {
          prefixType = 'numbered';
          content = line.slice(isNumbered[0].length);
        } else if (isQuote) {
          prefixType = 'quote';
          content = line.slice(isQuote[0].length);
        }

        if (format === 'bulleted-list') {
          if (prefixType === 'bullet') {
            return content; // Toggle off
          } else {
            return `- ${content}`; // Replace prefix with bullet list option
          }
        } else if (format === 'numbered-list') {
          if (prefixType === 'numbered') {
            return content; // Toggle off
          } else {
            return `${i + 1}. ${content}`; // Replace prefix with numbered list option
          }
        } else if (format === 'quote') {
          if (prefixType === 'quote') {
            return content; // Toggle off
          } else {
            return `> ${content}`; // Replace prefix with quote option
          }
        }

        return line;
      });

      const replacement = modifiedLines.join('\n');

      const firstLineDiff = modifiedLines[0].length - lines[0].length;
      const totalDiff = replacement.length - rawLinesText.length;

      const newStart = Math.max(targetStart, start + firstLineDiff);
      const newEnd = Math.max(newStart, end + totalDiff);

      // Programmatically select and replace the entire line span
      textarea.setSelectionRange(targetStart, targetEnd);
      document.execCommand('insertText', false, replacement);

      // Restore user's exact original selection to retain active UI context
      textarea.setSelectionRange(newStart, newEnd);
      setSelectionRange([textarea.selectionStart, textarea.selectionEnd]);
      resizeTextarea(textarea);
      return;
    }

    // Otherwise, inline formatting
    const selectedText = value.slice(start, end);
    const markerMap: Record<string, string> = {
      bold: '*',
      italic: '_',
      strikethrough: '~',
      'inline-code': '`',
    };

    if (markerMap[format as keyof typeof markerMap]) {
      const marker = markerMap[format as keyof typeof markerMap];

      let stripped = selectedText;
      let peeledPrefix = '';
      let peeledSuffix = '';
      let isInside = false;

      let changed = true;
      while (changed) {
        changed = false;
        for (const m of ['*', '_', '~', '`']) {
          if (
            stripped.length >= 2 &&
            stripped.startsWith(m) &&
            stripped.endsWith(m)
          ) {
            if (m === marker) {
              isInside = true;
            } else {
              peeledPrefix += m;
              peeledSuffix = m + peeledSuffix;
            }
            stripped = stripped.slice(m.length, -m.length);
            changed = true;
          }
        }
      }

      let isOutside = false;
      if (!isInside) {
        const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
        const lineEndCandidate = value.indexOf('\n', end);
        const lineEnd =
          lineEndCandidate === -1 ? value.length : lineEndCandidate;

        const beforeText = value.slice(lineStart, start);
        const afterText = value.slice(end, lineEnd);
        const beforeCount = beforeText.split(marker).length - 1;
        const afterCount = afterText.split(marker).length - 1;

        if (beforeCount % 2 === 1 && afterCount % 2 === 1) {
          isOutside = true;
        }
      }

      if (isInside) {
        const replacementStr = peeledPrefix + stripped + peeledSuffix;
        document.execCommand('insertText', false, replacementStr);
        textarea.setSelectionRange(start, start + replacementStr.length);
      } else if (isOutside) {
        const beforeMarkerIdx = value.lastIndexOf(marker, start - 1);
        const afterMarkerIdx = value.indexOf(marker, end);

        textarea.setSelectionRange(
          beforeMarkerIdx,
          afterMarkerIdx + marker.length,
        );
        const innerReplacement =
          value.slice(beforeMarkerIdx + marker.length, start) +
          selectedText +
          value.slice(end, afterMarkerIdx);
        document.execCommand('insertText', false, innerReplacement);

        textarea.setSelectionRange(start - marker.length, end - marker.length);
      } else {
        const replacementStr = `${marker}${selectedText}${marker}`;
        document.execCommand('insertText', false, replacementStr);
        if (selectedText.length > 0) {
          textarea.setSelectionRange(
            start + marker.length,
            start + marker.length + selectedText.length,
          );
        } else {
          textarea.setSelectionRange(
            start + marker.length,
            start + marker.length,
          );
        }
      }
    }
    setIsFormatToolbarDismissed(false);
    setSelectionRange([textarea.selectionStart, textarea.selectionEnd]);
    resizeTextarea(textarea);
    return;
  };

  const openFilePicker = (type: MediaPickerType) => {
    if (type === 'audio') {
      audioInputRef.current?.click();
      return;
    }

    if (type === 'document') {
      documentInputRef.current?.click();
      return;
    }

    photoVideoInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type) {
      toast.error(t('unsupportedFile'));
      return;
    }

    clearSelectedMedia();
    setSelectedMedia({
      file,
      previewUrl: URL.createObjectURL(file),
    });
  };

  const trimmedDraft = draft.trim();
  const canSendMessage = Boolean(trimmedDraft || selectedMedia);

  const showFormatToolbar =
    conversation.canSendFreeform &&
    draft.length > 0 &&
    ((!isSelectionActive && !isFormatToolbarDismissed) ||
      (isSelectionActive && !isBlockToolbarDismissed));

  const insertTextAtSelection = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.focus();
    // Native insertText preserves general undo/redo stack
    document.execCommand('insertText', false, text);
    setIsFormatToolbarDismissed(false);
    setIsBlockToolbarDismissed(false);
    resizeTextarea(textarea);
  };

  const continueCurrentLine = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;

    if (selectionStart !== selectionEnd) {
      insertTextAtSelection('\n');
      return;
    }

    const { line, lineStart, lineEnd } = getCurrentLine(draft, selectionStart);
    const continuedPrefix = getContinuedLinePrefix(line);

    if (continuedPrefix === '') {
      // Select the prefix region and delete it via insertText to support undo/redo
      textarea.setSelectionRange(lineStart, lineEnd);
      document.execCommand('insertText', false, '');
      resizeTextarea(textarea);
      return;
    }

    insertTextAtSelection(`\n${continuedPrefix ?? ''}`);
  };

  function handleSend() {
    if (!conversation.canSendFreeform || !canSendMessage) {
      return;
    }

    if (selectedMedia) {
      onSendMediaAction({
        file: selectedMedia.file,
        caption: trimmedDraft || undefined,
      });
      resetComposer();
      return;
    }

    onSendAction(trimmedDraft);
    resetComposer();
  }

  return (
    <div className="w-full shrink-0 bg-transparent">
      {selectedMedia ? (
        <MediaPreview
          selectedMedia={selectedMedia}
          onRemove={clearSelectedMedia}
          removeAriaLabel={t('removeMedia')}
        />
      ) : null}

      <input
        ref={documentInputRef}
        type="file"
        accept={documentAccept}
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={photoVideoInputRef}
        type="file"
        accept={photoVideoAccept}
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept={audioAccept}
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="relative flex items-end bg-transparent px-4 pt-0 pb-3">
        {showFormatToolbar ? (
          <TextFormatToolbar
            disabled={!conversation.canSendFreeform}
            activeFormats={getActiveFormats(
              draft,
              selectionRange[0],
              selectionRange[1],
            )}
            getLabel={(key) => t(key)}
            onCloseAction={() => {
              if (isSelectionActive) {
                setIsBlockToolbarDismissed(true);
              } else {
                setIsFormatToolbarDismissed(true);
              }
            }}
            onFormatAction={applyTextFormat}
          />
        ) : null}

        <div
          className={cn(
            'flex min-h-14 max-h-36 flex-1 items-end gap-1 overflow-hidden rounded-2xl border bg-background px-2 py-2 shadow-sm transition-[border-color,box-shadow]',
            conversation.canSendFreeform
              ? 'focus-within:ring-2 focus-within:ring-brand/80'
              : 'pointer-events-none opacity-50',
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={!conversation.canSendFreeform}
                className="size-10 shrink-0 rounded-full text-muted-foreground hover:bg-brand/10 hover:text-brand"
              >
                <PlusIcon />
                <span className="sr-only">{t('attach')}</span>
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
                      onSelect={() => openFilePicker(option.type)}
                      className="min-h-11 cursor-pointer gap-3 whitespace-nowrap rounded-md px-3 py-2.5 text-foreground/60 focus:bg-brand/5 focus:!text-brand focus:**:!text-brand"
                    >
                      <Icon />
                      {t(
                        option.type === 'document'
                          ? 'document'
                          : option.type === 'photo-video'
                            ? 'media'
                            : 'audio',
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="relative min-h-10 flex-1">
            {!draft ? (
              <div className="pointer-events-none absolute inset-0 py-2.5 text-[15px] leading-tight text-muted-foreground/70">
                {conversation.canSendFreeform
                  ? selectedMedia
                    ? t('placeholderMedia')
                    : t('placeholder')
                  : t('placeholderTemplate')}
              </div>
            ) : null}

            {draft ? (
              <div
                ref={overlayRef}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap py-2.5 text-[15px] leading-tight wrap-break-word font-sans [scrollbar-width:thin] [scrollbar-color:transparent_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent"
              >
                {draft.split('\n').map((line, index, arr) => {
                  const key = `co-${index}`;
                  let renderedLine: ReactNode = null;

                  if (isQuoteLine(line)) {
                    const quoteMatch = /^\s{0,3}>\s+/.exec(line);
                    const prefix = quoteMatch ? quoteMatch[0] : '> ';
                    const actualContent = line.slice(prefix.length);
                    renderedLine = (
                      <span key={key}>
                        <span className="text-brand/75">{prefix}</span>
                        {renderInlineComposerText(
                          actualContent,
                          `${key}-quote`,
                        )}
                      </span>
                    );
                  } else if (isBulletLine(line)) {
                    const bulletMatch = /^\s{0,3}[-*]\s+/.exec(line);
                    const prefix = bulletMatch ? bulletMatch[0] : '- ';
                    const actualContent = line.slice(prefix.length);
                    renderedLine = (
                      <span key={key}>
                        <span className="text-brand/75">{prefix}</span>
                        {renderInlineComposerText(
                          actualContent,
                          `${key}-bullet`,
                        )}
                      </span>
                    );
                  } else if (isNumberedLine(line)) {
                    const numMatch = /^\s{0,3}\d{1,2}\.\s+/.exec(line);
                    const prefix = numMatch ? numMatch[0] : '1. ';
                    const actualContent = line.slice(prefix.length);
                    renderedLine = (
                      <span key={key}>
                        <span className="text-brand/75">{prefix}</span>
                        {renderInlineComposerText(
                          actualContent,
                          `${key}-numbered`,
                        )}
                      </span>
                    );
                  } else if (isCodeFenceStart(line)) {
                    renderedLine = (
                      <span key={key} className="text-brand/75">
                        {line}
                      </span>
                    );
                  } else {
                    renderedLine = (
                      <span key={key}>
                        {renderInlineComposerText(line, key)}
                      </span>
                    );
                  }

                  return index === arr.length - 1 ? (
                    renderedLine
                  ) : (
                    <span key={`${key}-w`}>
                      {renderedLine}
                      {'\n'}
                    </span>
                  );
                })}
              </div>
            ) : null}

            <Textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => {
                const nextDraft = event.target.value;
                setDraft(nextDraft);
                if (!nextDraft) {
                  setIsFormatToolbarDismissed(false);
                }
                resizeTextarea(event.currentTarget);
              }}
              onScroll={syncOverlayScroll}
              onSelect={(event) => {
                const target = event.target as HTMLTextAreaElement;
                const nextSelectionRange: [number, number] = [
                  target.selectionStart,
                  target.selectionEnd,
                ];

                setSelectionRange(nextSelectionRange);

                if (nextSelectionRange[0] === nextSelectionRange[1]) {
                  setIsBlockToolbarDismissed(false);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  if (event.shiftKey) {
                    event.preventDefault();
                    continueCurrentLine();
                    return;
                  }

                  event.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              maxLength={CHAT_MESSAGE_CHARACTER_LIMIT}
              disabled={!conversation.canSendFreeform}
              className={cn(
                'relative h-10 min-h-10! max-h-32 resize-none border-0 bg-transparent p-0 py-2.5 pr-2.5 text-[15px] leading-tight shadow-none caret-foreground focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-100 placeholder:text-muted-foreground/70 [scrollbar-width:thin] [scrollbar-color:hsla(0,0%,0%,0.1)_transparent] dark:[scrollbar-color:hsla(0,0%,100%,0.1)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-black/20 dark:hover:[&::-webkit-scrollbar-thumb]:bg-white/20',
                draft && 'text-transparent selection:bg-brand/20',
              )}
            />
          </div>

          <Button
            onClick={handleSend}
            disabled={!conversation.canSendFreeform || !canSendMessage}
            size="icon"
            variant="ghost"
            className={cn(
              'size-10 shrink-0 cursor-pointer rounded-full transition-colors',
              canSendMessage
                ? 'text-brand hover:bg-brand/10 hover:text-brand'
                : 'text-muted-foreground/40 hover:bg-transparent hover:text-muted-foreground/40',
            )}
          >
            <SendHorizontalIcon className="size-5" />
            <span className="sr-only">{t('send')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
