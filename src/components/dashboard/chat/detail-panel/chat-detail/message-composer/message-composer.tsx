'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CHAT_MESSAGE_CHARACTER_LIMIT } from '@/lib/chat/chat';
import { cn } from '@/lib/utils';
import type { ChatConversation } from '@/types/chat';
import { SendHorizontalIcon } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { type KeyboardEvent, type RefObject, useCallback, useRef } from 'react';
import { toast } from 'sonner';

import { FormattedTextOverlay } from './formatting/formatted-text-overlay';
import { TextFormatToolbar } from './formatting/text-format-toolbar';
import { useComposerText } from './hooks/use-composer-text';
import { MediaDropZone } from './media/media-drop-zone';
import { MediaPicker } from './media/media-picker';
import { MediaPreviewGrid } from './media/media-preview-grid';
import { useMediaAttachments } from './media/use-media-attachments';
import { useMediaDragDrop } from './media/use-media-drag-drop';
import type { SendMediaMessageBatchInput } from './types';

export function MessageComposer({
  conversation,
  focusRequest = 0,
  mediaDropAreaRef,
  onSendAction,
  onSendMediaAction,
}: {
  conversation: ChatConversation;
  focusRequest?: number;
  mediaDropAreaRef?: RefObject<HTMLElement | null>;
  onSendAction: (content: string) => void;
  onSendMediaAction: (input: SendMediaMessageBatchInput) => void;
}) {
  const t = useTranslations('Chat.composer');
  const shouldReduceMotion = Boolean(useReducedMotion());
  const mediaDropZoneRef = useRef<HTMLDivElement>(null);
  const {
    activeFormats,
    applyTextFormat,
    closeFormatToolbar,
    continueCurrentLine,
    draft,
    handleChange,
    handleSelect,
    overlayRef,
    resetText,
    setDraft,
    showFormatToolbar,
    syncOverlayScroll,
    textareaRef,
  } = useComposerText({
    canSendFreeform: conversation.canSendFreeform,
    conversationId: conversation.id,
    focusRequest,
  });

  const handleUnsupportedFile = useCallback(
    (file: File) => toast.error(`${file.name}: ${t('unsupportedFile')}`),
    [t],
  );
  const handleMaxFilesExceeded = useCallback(
    (max: number) => toast.error(t('maxFilesExceeded', { max })),
    [t],
  );
  const handleAudioCaptionNotSupported = useCallback(
    () => toast.error(t('audioCaptionNotSupported')),
    [t],
  );

  const media = useMediaAttachments({
    draft,
    setDraft,
    textareaRef,
    onAudioCaptionNotSupported: handleAudioCaptionNotSupported,
    onMaxFilesExceeded: handleMaxFilesExceeded,
    onUnsupportedFile: handleUnsupportedFile,
  });
  const dragDrop = useMediaDragDrop({
    canSendFreeform: conversation.canSendFreeform,
    mediaDropAreaRef,
    mediaDropZoneRef,
    onAddFiles: media.addMediaFiles,
  });

  const trimmedDraft = draft.trim();
  const canSendMessage = Boolean(trimmedDraft || media.selectedMedia.length);

  const resetComposer = () => {
    resetText();
    media.clearSelectedMedia();
  };

  const handleSend = () => {
    if (!conversation.canSendFreeform || !canSendMessage) return;

    if (media.selectedMedia.length > 0) {
      onSendMediaAction({
        files: media.selectedMedia.map((selectedMedia, index) => ({
          file: selectedMedia.file,
          caption:
            index === media.captionTargetIndex
              ? trimmedDraft || undefined
              : selectedMedia.caption || undefined,
        })),
      });

      if (media.captionTargetIndex === -1 && trimmedDraft) {
        onSendAction(trimmedDraft);
      }
      resetComposer();
      return;
    }

    onSendAction(trimmedDraft);
    resetComposer();
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter') return;

    if (event.shiftKey) {
      event.preventDefault();
      continueCurrentLine();
      return;
    }

    event.preventDefault();
    handleSend();
  };

  return (
    <motion.div
      layout={!shouldReduceMotion}
      className="w-full shrink-0"
      transition={{
        layout: {
          duration: shouldReduceMotion ? 0 : 0.2,
          ease: 'easeOut',
        },
      }}
    >
      <AnimatePresence initial={false} mode="wait">
        {dragDrop.isDraggingMedia ? (
          <MediaDropZone
            dropZoneRef={mediaDropZoneRef}
            isDraggingOverDropZone={dragDrop.isDraggingOverDropZone}
            label={t('dropMedia')}
            shouldReduceMotion={shouldReduceMotion}
          />
        ) : (
          <motion.div
            key="message-composer"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.14,
              ease: 'easeOut',
            }}
            className="relative w-full bg-transparent"
          >
            <MediaPreviewGrid
              selectedMedia={media.selectedMedia}
              onRemove={media.removeMedia}
              removeAriaLabel={t('removeMedia')}
              captionTargetIndex={media.captionTargetIndex}
              onSelectCaptionTarget={media.selectCaptionTarget}
            />

            <div className="relative flex items-end bg-transparent px-4 pt-0 pb-3">
              {showFormatToolbar ? (
                <TextFormatToolbar
                  disabled={!conversation.canSendFreeform}
                  activeFormats={activeFormats}
                  getLabel={(key) => t(key)}
                  onClose={closeFormatToolbar}
                  onFormat={applyTextFormat}
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
                <MediaPicker
                  disabled={!conversation.canSendFreeform}
                  inputRefs={media.inputRefs}
                  onFileChange={media.handleFileChange}
                  onOpen={media.openFilePicker}
                  getLabel={(key) => t(key)}
                />

                <div className="relative min-h-10 flex-1">
                  {!draft ? (
                    <div className="pointer-events-none absolute inset-0 py-2.5 text-[15px] leading-tight text-muted-foreground/70">
                      {conversation.canSendFreeform
                        ? media.selectedMedia.length > 0
                          ? t('placeholderMedia')
                          : t('placeholder')
                        : t('placeholderTemplate')}
                    </div>
                  ) : null}

                  <FormattedTextOverlay draft={draft} overlayRef={overlayRef} />

                  <Textarea
                    ref={textareaRef}
                    value={draft}
                    onPaste={media.handlePaste}
                    onChange={handleChange}
                    onScroll={syncOverlayScroll}
                    onSelect={handleSelect}
                    onKeyDown={handleComposerKeyDown}
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
