'use client';

import { MessageStatus } from '@/components/chat/detail-panel/chat-detail/message-status';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { useElementInViewport } from '@/hooks/use-element-in-viewport';
import { useMessageMediaDownloadUrl } from '@/hooks/use-message';
import { formatMessageTimestamp } from '@/lib/chat/chat-format';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types/chat';
import { EyeOffIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { AudioMessage } from './audio-message';
import { DocumentMessage } from './document-message';
import { ImageMessage } from './image-message';
import { MediaMessageSkeleton } from './media-message-skeleton';
import { MediaPlaceholder } from './media-placeholder';
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
};

const mediaRenderers = {
  audio: AudioMessage,
  document: DocumentMessage,
  image: ImageMessage,
  video: VideoMessage,
} satisfies Record<
  MediaMessageType,
  (props: MediaRendererProps) => ReactElement
>;

function getLocalMediaUrl(metadata: string | null) {
  if (!metadata) {
    return null;
  }

  try {
    const parsed = JSON.parse(metadata) as { localMediaUrl?: unknown };
    return typeof parsed.localMediaUrl === 'string'
      ? parsed.localMediaUrl
      : null;
  } catch {
    return null;
  }
}

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
  const canLoadMedia = Boolean(mediaType && wabaId && message.mediaObjectKey);
  const { data, error, isError, isStale, refetch } = useMessageMediaDownloadUrl(
    {
      wabaId,
      convId: message.conversationId,
      key: message.mediaObjectKey,
      enabled: canLoadMedia && isInViewport,
    },
  );

  if (message.type === 'text') {
    return <TextMessage message={message} />;
  }

  if (message.type === 'media_placeholder') {
    return (
      <MediaPlaceholder
        icon={EyeOffIcon}
        title={t('unsupported', { type: 'media' })}
        description={t('errorUnavailable')}
      />
    );
  }

  if (!mediaType) {
    return <UnsupportedMessage type={message.type} />;
  }

  const Renderer = mediaRenderers[mediaType];
  const title = getMediaTitle(message, `${mediaType} message`);
  const icon = mediaTypeIcons[mediaType];
  const localMediaUrl = getLocalMediaUrl(message.metadata);

  if (localMediaUrl) {
    return <Renderer message={message} downloadUrl={localMediaUrl} />;
  }

  if (!canLoadMedia) {
    return (
      <MediaPlaceholder
        icon={icon}
        title={title}
        description={t('errorUnavailable')}
      />
    );
  }

  if (isError) {
    return (
      <MediaPlaceholder
        icon={icon}
        title={title}
        description={getMediaLoadErrorDescription(error, t('errorLoad'))}
      />
    );
  }

  if (!data) {
    return <MediaMessageSkeleton type={mediaType} />;
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
    />
  );
}

function MessageBubble({ message, wabaId }: MessageBubbleProps) {
  const isOutgoing = message.direction === 'outgoing';
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
        className="max-w-[85%]"
        variant={isOutgoing ? 'tinted' : 'muted'}
      >
        <BubbleContent
          className={cn(
            'min-w-30 rounded-2xl border-border/40 px-3 py-2 shadow-sm',
            isOutgoing ? 'rounded-tr-sm' : 'rounded-tl-sm',
          )}
        >
          <MessageBubbleContent
            message={message}
            wabaId={wabaId}
            isInViewport={isInViewport}
          />

          <div
            className={cn(
              'mt-1.5 flex items-center justify-end gap-1 text-[11px]',
              isOutgoing ? 'text-primary/70' : 'text-muted-foreground/70',
            )}
          >
            <span>{formatMessageTimestamp(message.timestamp)}</span>
            {isOutgoing ? <MessageStatus status={message.status} /> : null}
          </div>
        </BubbleContent>
      </Bubble>
    </div>
  );
}

export { MessageBubble };
