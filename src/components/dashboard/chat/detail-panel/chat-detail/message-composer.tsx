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
import { CHAT_MESSAGE_CHARACTER_LIMIT } from '@/lib/chat/chat';
import { cn } from '@/lib/utils';
import type { ChatConversation } from '@/types/chat';
import {
  AlertTriangleIcon,
  FileTextIcon,
  ImageIcon,
  MusicIcon,
  PlusIcon,
  SendHorizontalIcon,
  XIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type MediaPickerType = 'audio' | 'document' | 'photo-video';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
  };

  const resetTextarea = () => {
    if (!textareaRef.current) {
      return;
    }
    textareaRef.current.style.height = '40px';
    textareaRef.current.style.overflowY = 'hidden';
  };

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
    clearSelectedMedia();
    resetTextarea();
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
    <div className="w-full shrink-0 bg-transparent pb-3">
      {!conversation.canSendFreeform ? (
        <div className="mx-4 my-2 flex items-center gap-3 rounded-xl border border-amber-400/40 bg-amber-50 px-4 py-3 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
          <AlertTriangleIcon className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              {t('templateRequired')}
            </p>
            <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-200/80">
              {t('templateDesc')}
            </p>
          </div>
        </div>
      ) : null}

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

      <div className="flex items-end bg-transparent px-4 py-1">
        <div className="flex min-h-14 flex-1 items-end gap-1 rounded-2xl border bg-background px-2 py-2 shadow-sm transition-[border-color,box-shadow] focus-within:ring-2 focus-within:ring-brand/80">
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
              className="w-64 overflow-hidden rounded-lg border bg-background p-0 text-foreground shadow-lg"
            >
              <DropdownMenuGroup className="p-2">
                {mediaPickerOptions.map((option) => {
                  const Icon = option.icon;

                  return (
                    <DropdownMenuItem
                      key={option.type}
                      onSelect={() => openFilePicker(option.type)}
                      className="min-h-11 cursor-pointer gap-3 rounded-md px-3 py-2.5 text-foreground/60 focus:bg-brand/5 focus:!text-brand focus:**:!text-brand"
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

          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              resizeTextarea(event.currentTarget);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            maxLength={CHAT_MESSAGE_CHARACTER_LIMIT}
            disabled={!conversation.canSendFreeform}
            placeholder={
              conversation.canSendFreeform
                ? selectedMedia
                  ? t('placeholderMedia')
                  : t('placeholder')
                : t('placeholderTemplate')
            }
            className="h-10 min-h-10! max-h-32 resize-none border-0 bg-transparent p-0 py-2.5 text-[15px] leading-tight shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-100 placeholder:opacity-50 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          />

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
