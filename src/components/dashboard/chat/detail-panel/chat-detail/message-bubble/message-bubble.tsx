'use client';

import { MessageStatus } from '@/components/dashboard/chat/detail-panel/chat-detail/message-status';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { useElementInViewport } from '@/hooks/use-element-in-viewport';
import { useMessageMediaDownloadUrl } from '@/hooks/use-message';
import { formatMessageTimestamp } from '@/lib/chat/chat-format';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types/chat';
import { AlertCircleIcon, EyeOffIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { AudioMessage } from './audio-message';
import { DocumentMessage } from './document-message';
import { ImageMessage } from './image-message';
import { MediaMessageSkeleton } from './media-message-skeleton';
import { MediaPlaceholder } from './media-placeholder';
import { MessageCaption } from './message-caption';
import {
  getMediaTitle,
  isMediaMessageType,
  mediaTypeIcons,
} from './message-utils';
import { TextMessage } from './text-message';
import type { MediaMessageType, MediaRendererProps } from './types';
import { UnsupportedMessage } from './unsupported-message';
import { VideoMessage } from './video-message';

type MessageBubbleProps = {
  message: ChatMessage;
  wabaId?: string;
  isFirstInGroup?: boolean;
};

function MessageMetadata({ message }: { message: ChatMessage }) {
  const isOutgoing = message.direction === 'outgoing';

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-end gap-0.5 pr-0.5 text-[10px] leading-none tabular-nums',
        isOutgoing ? 'text-brand/80' : 'text-muted-foreground/70',
      )}
    >
      <span>{formatMessageTimestamp(message.timestamp)}</span>
      {isOutgoing ? (
        <MessageStatus status={message.status} className="size-3.5" />
      ) : null}
    </div>
  );
}

const mediaRenderers = {
  audio: AudioMessage,
  document: DocumentMessage,
  image: ImageMessage,
  video: VideoMessage,
} satisfies Record<
  MediaMessageType,
  (props: MediaRendererProps) => ReactElement
>;

function getMediaLoadErrorDescription(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function MessageBubbleContent({
  isInViewport,
  message,
  wabaId,
}: {
  isInViewport: boolean;
  message: ChatMessage;
  wabaId?: string;
}) {
  const t = useTranslations('Chat.bubble');
  const mediaType = isMediaMessageType(message.type) ? message.type : null;
  const metadata = <MessageMetadata message={message} />;
  const floatingMetadata = (
    <div className="absolute right-[11px] bottom-1.5">{metadata}</div>
  );
  const canLoadMedia = Boolean(mediaType && wabaId && message.mediaObjectKey);
  const { data, error, isError, isStale, refetch } = useMessageMediaDownloadUrl(
    {
      wabaId,
      convId: message.conversationId,
      key: message.mediaObjectKey,
      enabled: canLoadMedia && isInViewport && !message.localMediaUrl,
    },
  );

  if (message.type === 'text') {
    return (
      <>
        <TextMessage message={message} />
        {floatingMetadata}
      </>
    );
  }

  if (message.type === 'media_placeholder') {
    return (
      <>
        <MediaPlaceholder
          icon={EyeOffIcon}
          title="Media Expired"
          description="This media is no longer available and cannot be downloaded or viewed."
        />
        {floatingMetadata}
      </>
    );
  }

  if (message.type === 'errors' || message.type === 'error') {
    return (
      <>
        <MediaPlaceholder
          icon={AlertCircleIcon}
          title="Error"
          description="This message could not be processed due to an error."
        />
        {floatingMetadata}
      </>
    );
  }

  if (!mediaType) {
    return (
      <>
        <UnsupportedMessage type={message.type} />
        {floatingMetadata}
      </>
    );
  }

  const Renderer = mediaRenderers[mediaType];
  const title = getMediaTitle(message, `${mediaType} message`);
  const icon = mediaTypeIcons[mediaType];
  const localMediaUrl = message.localMediaUrl;

  if (localMediaUrl) {
    return (
      <Renderer
        message={message}
        downloadUrl={localMediaUrl}
        metadata={metadata}
      />
    );
  }

  if (!canLoadMedia) {
    return (
      <>
        <MediaPlaceholder
          icon={icon}
          title={title}
          description={t('errorUnavailable')}
        />
        {floatingMetadata}
      </>
    );
  }

  if (isError) {
    return (
      <>
        <MediaPlaceholder
          icon={icon}
          title={title}
          description={getMediaLoadErrorDescription(error, t('errorLoad'))}
        />
        {floatingMetadata}
      </>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-0.5">
        <MediaMessageSkeleton
          type={mediaType}
          metadata={message.content ? null : metadata}
        />
        <MessageCaption content={message.content} metadata={metadata} />
      </div>
    );
  }

  const getFreshDownloadUrl = async () => {
    if (!isStale) {
      return data.downloadUrl;
    }

    const result = await refetch();
    return result.data?.downloadUrl ?? data.downloadUrl;
  };

  return (
    <Renderer
      message={message}
      downloadUrl={data.downloadUrl}
      getFreshDownloadUrl={getFreshDownloadUrl}
      isDownloadUrlStale={isStale}
      metadata={metadata}
    />
  );
}

function MessageBubble({
  message,
  wabaId,
  isFirstInGroup = true,
}: MessageBubbleProps) {
  const isOutgoing = message.direction === 'outgoing';
  const isMediaMessage = isMediaMessageType(message.type);
  const { ref, isInViewport } = useElementInViewport();

  return (
    <div
      ref={ref}
      className={cn(
        'flex min-w-0 w-full',
        isOutgoing ? 'justify-end' : 'justify-start',
      )}
    >
      <Bubble
        align={isOutgoing ? 'end' : 'start'}
        className={isMediaMessage ? 'max-w-[calc(100vw-2rem)]' : 'max-w-[70%]'}
        variant={isOutgoing ? 'tinted' : 'surface'}
      >
        <BubbleContent
          className={cn(
            'relative min-w-20 rounded-[8px]',
            isMediaMessage ? 'p-[3px]' : 'px-2.5 pt-1.5 pb-1.5',
            isOutgoing
              ? isFirstInGroup
                ? 'rounded-tr-none'
                : ''
              : cn(
                  'border border-border/20 shadow-sm',
                  isFirstInGroup ? 'rounded-tl-none' : '',
                ),
          )}
        >
          <MessageBubbleContent
            message={message}
            wabaId={wabaId}
            isInViewport={isInViewport}
          />
        </BubbleContent>
        {isFirstInGroup && isOutgoing && (
          <div
            data-slot="bubble-content"
            className="absolute top-0 -right-[7px] w-[8px] h-[12px] z-10"
            style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
          />
        )}
        {isFirstInGroup && !isOutgoing && (
          <svg
            className="absolute top-0 -left-[7px] w-[8px] h-[12px] z-10 overflow-visible"
            viewBox="0 0 8 12"
          >
            <path d="M 8 0 L 0 0 L 8 12" className="fill-background" />
            <path
              d="M 8 0 L 0 0 L 8 12"
              className="stroke-border/40"
              fill="none"
              strokeWidth="1"
            />
          </svg>
        )}
      </Bubble>
    </div>
  );
}

export { MessageBubble };
