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
  type ClipboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import { getDocumentVisual } from './message-bubble/document-message';
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
  caption?: string;
};

export type SendMediaMessageBatchInput = {
  files: Array<{ file: File; caption?: string }>;
};

const MAX_MEDIA_FILES = 10;

const documentMimeTypes = [
  'text/plain',
  'application/pdf',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
] as const;

const photoVideoMimeTypes = [
  'image/jpeg',
  'image/png',
  'video/3gpp',
  'video/mp4',
] as const;

const audioMimeTypes = [
  'audio/aac',
  'audio/amr',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
] as const;

const documentAccept = documentMimeTypes.join(',');
const photoVideoAccept = photoVideoMimeTypes.join(',');
const audioAccept = audioMimeTypes.join(',');
const supportedMediaMimeTypes = new Set<string>([
  ...documentMimeTypes,
  ...photoVideoMimeTypes,
  ...audioMimeTypes,
]);

const mediaMimeTypeByExtension: Record<string, string> = {
  '.3gp': 'video/3gpp',
  '.aac': 'audio/aac',
  '.amr': 'audio/amr',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.oga': 'audio/ogg',
  '.ogg': 'audio/ogg',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx':
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

const defaultPastedFileNameByMimeType: Record<string, string> = {
  'image/jpeg': 'pasted-image.jpg',
  'image/png': 'pasted-image.png',
  'video/3gpp': 'pasted-video.3gp',
  'video/mp4': 'pasted-video.mp4',
  'audio/aac': 'pasted-audio.aac',
  'audio/amr': 'pasted-audio.amr',
  'audio/mpeg': 'pasted-audio.mp3',
  'audio/mp4': 'pasted-audio.m4a',
  'audio/ogg': 'pasted-audio.ogg',
  'text/plain': 'pasted-document.txt',
  'application/pdf': 'pasted-document.pdf',
  'application/msword': 'pasted-document.doc',
  'application/vnd.ms-excel': 'pasted-document.xls',
  'application/vnd.ms-powerpoint': 'pasted-document.ppt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'pasted-document.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    'pasted-document.xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'pasted-document.pptx',
};

function getFilenameExtension(filename: string) {
  const extensionStart = filename.lastIndexOf('.');
  return extensionStart === -1
    ? ''
    : filename.slice(extensionStart).toLowerCase();
}

function normalizeMediaFile(file: File) {
  const normalizedMimeType = file.type.split(';')[0]?.trim().toLowerCase();
  const canInferMimeType =
    !normalizedMimeType || normalizedMimeType === 'application/octet-stream';
  const inferredMimeType = canInferMimeType
    ? mediaMimeTypeByExtension[getFilenameExtension(file.name)]
    : undefined;
  const mimeType = supportedMediaMimeTypes.has(normalizedMimeType)
    ? normalizedMimeType
    : inferredMimeType;

  if (!mimeType) {
    return null;
  }

  const filename =
    file.name.trim() ||
    defaultPastedFileNameByMimeType[mimeType] ||
    'pasted-file';

  if (file.type === mimeType && file.name === filename) {
    return file;
  }

  return new File([file], filename, {
    type: mimeType,
    lastModified: file.lastModified,
  });
}

function getClipboardFiles(clipboardData: DataTransfer) {
  const itemFiles = Array.from(clipboardData.items)
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);

  return itemFiles.length > 0 ? itemFiles : Array.from(clipboardData.files);
}

const mediaPickerOptions = [
  {
    type: 'document' as const,
    label: 'document',
    icon: FileTextIcon,
    color: 'text-slate-500!',
  },
  {
    type: 'photo-video' as const,
    label: 'media',
    icon: ImageIcon,
    color: 'text-violet-500!',
  },
  {
    type: 'audio' as const,
    label: 'audio',
    icon: MusicIcon,
    color: 'text-pink-500!',
  },
] as const;

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

function MediaPreviewGrid({
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
        const description = formatFileSize(file.size);

        // Fetch accurate visual mapping based on the file extension/MIME identical to bubble chat
        const visual = getDocumentVisual({
          mediaFilename: file.name,
          mediaMimeType: file.type,
        });

        const IconComponent = visual.Icon;
        const mappedLabel = visual.label;

        return (
          <div
            key={`${file.name}-${index}`}
            role="button"
            tabIndex={0}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelectCaptionTarget(index)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
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
                {mappedLabel} • {description}
              </span>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mr-0.5 size-7 shrink-0 rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
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

const defaultComposerFocusExclusionSelector = [
  'input:not([type="hidden"])',
  'select',
  'textarea',
  '[contenteditable="true"]',
  '[role="combobox"]',
  '[role="searchbox"]',
  '[role="textbox"]',
  '[data-composer-focus-exempt]',
].join(',');

function shouldPreserveCurrentFocus(
  activeElement: Element | null,
  composerElement: HTMLTextAreaElement | null,
) {
  if (
    !activeElement ||
    activeElement === document.body ||
    activeElement === document.documentElement ||
    activeElement === composerElement
  ) {
    return false;
  }

  return Boolean(activeElement.closest(defaultComposerFocusExclusionSelector));
}

function isPrintableComposerKey(event: KeyboardEvent) {
  return (
    event.key.length === 1 &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.isComposing
  );
}

export function MessageComposer({
  conversation,
  focusRequest = 0,
  onSendAction,
  onSendMediaAction,
}: {
  conversation: ChatConversation;
  focusRequest?: number;
  onSendAction: (content: string) => void;
  onSendMediaAction: (input: SendMediaMessageBatchInput) => void;
}) {
  const t = useTranslations('Chat.composer');
  const [draft, setDraft] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);
  const [captionTargetIndex, setCaptionTargetIndex] = useState(-1);
  const [selectionRange, setSelectionRange] = useState<[number, number]>([
    0, 0,
  ]);
  const [isBlockToolbarDismissed, setIsBlockToolbarDismissed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const photoVideoInputRef = useRef<HTMLInputElement>(null);
  const selectedMediaRef = useRef<SelectedMedia[]>([]);

  useEffect(() => {
    selectedMediaRef.current = selectedMedia;
  }, [selectedMedia]);

  useEffect(() => {
    return () => {
      selectedMediaRef.current.forEach((media) =>
        URL.revokeObjectURL(media.previewUrl),
      );
    };
  }, []);

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

  const replaceTextareaRange = useCallback(
    ({
      replacement,
      start,
      end,
      selectionStart,
      selectionEnd,
    }: {
      replacement: string;
      start: number;
      end: number;
      selectionStart: number;
      selectionEnd: number;
    }) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      textarea.setSelectionRange(start, end);
      // `insertText` preserves the textarea undo stack and inserts plain text, not HTML.
      // codeql[js/xss-through-dom]
      document.execCommand('insertText', false, replacement);
      textarea.setSelectionRange(selectionStart, selectionEnd);
      setDraft(textarea.value);
    },
    [],
  );

  useEffect(() => {
    syncOverlayScroll();
  }, [draft]);

  useEffect(() => {
    if (focusRequest === 0 || !conversation.canSendFreeform) {
      return;
    }

    textareaRef.current?.focus({ preventScroll: true });
  }, [conversation.canSendFreeform, focusRequest]);

  useEffect(() => {
    if (!conversation.canSendFreeform) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      const composerElement = textareaRef.current;

      if (shouldPreserveCurrentFocus(document.activeElement, composerElement)) {
        return;
      }

      composerElement?.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(frameId);
  }, [conversation.canSendFreeform, conversation.id]);

  useEffect(() => {
    if (!conversation.canSendFreeform) {
      return;
    }

    const handleDefaultComposerTyping = (event: KeyboardEvent) => {
      const composerElement = textareaRef.current;

      if (
        event.defaultPrevented ||
        !composerElement ||
        document.activeElement === composerElement ||
        shouldPreserveCurrentFocus(document.activeElement, composerElement) ||
        !isPrintableComposerKey(event)
      ) {
        return;
      }

      event.preventDefault();
      composerElement.focus({ preventScroll: true });
      replaceTextareaRange({
        replacement: event.key,
        start: composerElement.selectionStart,
        end: composerElement.selectionEnd,
        selectionStart: composerElement.selectionStart + event.key.length,
        selectionEnd: composerElement.selectionStart + event.key.length,
      });
      setIsBlockToolbarDismissed(false);
    };

    document.addEventListener('keydown', handleDefaultComposerTyping);

    return () => {
      document.removeEventListener('keydown', handleDefaultComposerTyping);
    };
  }, [conversation.canSendFreeform, replaceTextareaRange]);

  useEffect(() => {
    resetTextarea();
  }, [conversation.id]);

  const clearSelectedMedia = () => {
    setSelectedMedia((current) => {
      current.forEach((media) => URL.revokeObjectURL(media.previewUrl));
      return [];
    });
  };

  const resetComposer = () => {
    setDraft('');
    setCaptionTargetIndex(-1);
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
      replaceTextareaRange({
        replacement,
        start: targetStart,
        end: targetEnd,
        selectionStart: newStart,
        selectionEnd: newEnd,
      });

      // Restore user's exact original selection to retain active UI context
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
        replaceTextareaRange({
          replacement: replacementStr,
          start,
          end,
          selectionStart: start,
          selectionEnd: start + replacementStr.length,
        });
      } else if (isOutside) {
        const beforeMarkerIdx = value.lastIndexOf(marker, start - 1);
        const afterMarkerIdx = value.indexOf(marker, end);

        const innerReplacement =
          value.slice(beforeMarkerIdx + marker.length, start) +
          selectedText +
          value.slice(end, afterMarkerIdx);

        replaceTextareaRange({
          replacement: innerReplacement,
          start: beforeMarkerIdx,
          end: afterMarkerIdx + marker.length,
          selectionStart: start - marker.length,
          selectionEnd: end - marker.length,
        });
      } else {
        const replacementStr = `${marker}${selectedText}${marker}`;
        if (selectedText.length > 0) {
          replaceTextareaRange({
            replacement: replacementStr,
            start,
            end,
            selectionStart: start + marker.length,
            selectionEnd: start + marker.length + selectedText.length,
          });
        } else {
          replaceTextareaRange({
            replacement: replacementStr,
            start,
            end,
            selectionStart: start + marker.length,
            selectionEnd: start + marker.length,
          });
        }
      }
    }
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

  const getMediaListWithSavedDraft = () => {
    const list = [...selectedMedia];
    if (captionTargetIndex !== -1 && list[captionTargetIndex]) {
      list[captionTargetIndex] = {
        ...list[captionTargetIndex],
        caption: draft,
      };
    }
    return list;
  };

  const addMediaFiles = (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    const validFiles = files.flatMap((file) => {
      const normalizedFile = normalizeMediaFile(file);

      if (!normalizedFile) {
        toast.error(`${file.name}: ${t('unsupportedFile')}`);
        return [];
      }

      return [normalizedFile];
    });

    const baseList = getMediaListWithSavedDraft();
    const availableSlots = Math.max(MAX_MEDIA_FILES - baseList.length, 0);

    if (validFiles.length > availableSlots) {
      toast.error(t('maxFilesExceeded', { max: MAX_MEDIA_FILES }));
    }

    const newMedia = validFiles.slice(0, availableSlots).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      caption: '',
    }));

    if (newMedia.length === 0) {
      return;
    }

    const nextList = [...baseList, ...newMedia];
    let nextIndex = captionTargetIndex;

    // Auto assign if no valid target exists (e.g. was empty or only audio previously)
    if (nextIndex === -1 || nextIndex >= nextList.length) {
      nextIndex = nextList.findIndex((m) => !m.file.type.startsWith('audio/'));
    }

    setSelectedMedia(nextList);
    setCaptionTargetIndex(nextIndex);

    if (nextIndex !== captionTargetIndex && captionTargetIndex !== -1) {
      setDraft(nextIndex !== -1 ? nextList[nextIndex].caption || '' : '');
    }

    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const rawFiles = event.target.files;
    const files = rawFiles ? Array.from(rawFiles) : [];
    event.target.value = '';
    addMediaFiles(files);
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = getClipboardFiles(event.clipboardData);

    if (files.length === 0) {
      return;
    }

    event.preventDefault();
    addMediaFiles(files);
  };

  const trimmedDraft = draft.trim();
  const canSendMessage = Boolean(trimmedDraft || selectedMedia.length > 0);

  const showFormatToolbar =
    conversation.canSendFreeform &&
    draft.length > 0 &&
    isSelectionActive &&
    !isBlockToolbarDismissed;

  const insertTextAtSelection = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.focus();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextSelection = start + text.length;

    replaceTextareaRange({
      replacement: text,
      start,
      end,
      selectionStart: nextSelection,
      selectionEnd: nextSelection,
    });
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
      replaceTextareaRange({
        replacement: '',
        start: lineStart,
        end: lineEnd,
        selectionStart: lineStart,
        selectionEnd: lineStart,
      });
      resizeTextarea(textarea);
      return;
    }

    insertTextAtSelection(`\n${continuedPrefix ?? ''}`);
  };

  function handleSend() {
    if (!conversation.canSendFreeform || !canSendMessage) {
      return;
    }

    const finalText = trimmedDraft;

    if (selectedMedia.length > 0) {
      onSendMediaAction({
        files: selectedMedia.map((media, index) => ({
          file: media.file,
          caption:
            index === captionTargetIndex
              ? finalText || undefined
              : media.caption || undefined,
        })),
      });

      if (captionTargetIndex === -1 && finalText) {
        onSendAction(finalText);
      }

      resetComposer();
      return;
    }

    onSendAction(finalText);
    resetComposer();
  }

  return (
    <div className="w-full shrink-0 bg-transparent">
      {selectedMedia.length > 0 ? (
        <MediaPreviewGrid
          selectedMedia={selectedMedia}
          onRemove={(indexToRemove) => {
            const nextArr = [...selectedMedia];

            if (
              captionTargetIndex !== -1 &&
              captionTargetIndex !== indexToRemove
            ) {
              if (nextArr[captionTargetIndex]) {
                nextArr[captionTargetIndex] = {
                  ...nextArr[captionTargetIndex],
                  caption: draft,
                };
              }
            }

            URL.revokeObjectURL(nextArr[indexToRemove].previewUrl);
            nextArr.splice(indexToRemove, 1);

            let nextTargetIndex = captionTargetIndex;
            let nextDraft = draft;

            if (indexToRemove === captionTargetIndex) {
              const firstValid = nextArr.findIndex(
                (m) => !m.file.type.startsWith('audio/'),
              );
              nextTargetIndex = firstValid;
              nextDraft =
                firstValid !== -1 ? nextArr[firstValid].caption || '' : '';
            } else if (captionTargetIndex > indexToRemove) {
              nextTargetIndex = captionTargetIndex - 1;
            }

            setSelectedMedia(nextArr);
            setCaptionTargetIndex(nextTargetIndex);

            if (indexToRemove === captionTargetIndex) {
              setDraft(nextDraft);
            }
          }}
          removeAriaLabel={t('removeMedia')}
          captionTargetIndex={captionTargetIndex}
          onSelectCaptionTarget={(newIndex) => {
            if (newIndex === captionTargetIndex) return;

            if (newIndex >= 0 && newIndex < selectedMedia.length) {
              if (selectedMedia[newIndex].file.type.startsWith('audio/')) {
                toast.error(t('audioCaptionNotSupported'));
                return;
              }
            }

            const nextList = getMediaListWithSavedDraft();
            setSelectedMedia(nextList);
            setCaptionTargetIndex(newIndex);
            setDraft(newIndex !== -1 ? nextList[newIndex].caption || '' : '');
            textareaRef.current?.focus();
          }}
        />
      ) : null}

      <input
        ref={documentInputRef}
        type="file"
        multiple
        accept={documentAccept}
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={photoVideoInputRef}
        type="file"
        multiple
        accept={photoVideoAccept}
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={audioInputRef}
        type="file"
        multiple
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
            onCloseAction={() => setIsBlockToolbarDismissed(true)}
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
                      className="min-h-11 cursor-pointer gap-3 whitespace-nowrap rounded-md px-3 py-2.5 focus:bg-brand/5"
                    >
                      <Icon className={cn('size-5 shrink-0', option.color)} />
                      <span className="font-medium text-foreground/80!">
                        {t(option.label)}
                      </span>
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
                  ? selectedMedia.length > 0
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
              onPaste={handlePaste}
              onChange={(event) => {
                const nextDraft = event.target.value;
                setDraft(nextDraft);
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
