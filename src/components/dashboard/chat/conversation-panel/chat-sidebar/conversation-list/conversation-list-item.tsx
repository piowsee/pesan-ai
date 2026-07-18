import { ConversationAvatar } from '@/components/dashboard/chat/conversation-avatar';
import { MessageStatus } from '@/components/dashboard/chat/detail-panel/chat-detail/message-status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  type MediaPreviewMessageType,
  getMediaPreviewLabel,
  getMessagePreview,
  isMediaPreviewMessageType,
} from '@/lib/chat/chat';
import { formatConversationTimestamp } from '@/lib/chat/chat-format';
import { cn } from '@/lib/utils';
import type { ChatConversation } from '@/types/chat';
import { useTranslations } from 'next-intl';
import type { IconType } from 'react-icons';
import {
  FaFileAudio,
  FaFileExcel,
  FaFileImage,
  FaFileLines,
  FaFilePdf,
  FaFilePowerpoint,
  FaFileVideo,
  FaFileWord,
} from 'react-icons/fa6';

type MediaPreviewVisual = {
  Icon: IconType;
  colorClassName: string;
};

const mediaPreviewVisuals = {
  audio: { Icon: FaFileAudio, colorClassName: 'text-pink-500' },
  image: { Icon: FaFileImage, colorClassName: 'text-violet-500' },
  video: { Icon: FaFileVideo, colorClassName: 'text-cyan-600' },
} satisfies Record<
  Exclude<MediaPreviewMessageType, 'document'>,
  MediaPreviewVisual
>;

function getDocumentPreviewVisual(
  message: NonNullable<ChatConversation['lastMessage']>,
): MediaPreviewVisual {
  const filename = message.mediaFilename?.toLowerCase() ?? '';
  const mimeType = message.mediaMimeType?.toLowerCase() ?? '';

  if (filename.endsWith('.pdf') || mimeType === 'application/pdf') {
    return { Icon: FaFilePdf, colorClassName: 'text-red-600' };
  }

  if (
    /\.(xlsx?|csv)$/.test(filename) ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel') ||
    mimeType === 'text/csv'
  ) {
    return { Icon: FaFileExcel, colorClassName: 'text-emerald-600' };
  }

  if (
    /\.docx?$/.test(filename) ||
    mimeType.includes('wordprocessing') ||
    mimeType === 'application/msword'
  ) {
    return { Icon: FaFileWord, colorClassName: 'text-blue-600' };
  }

  if (
    /\.pptx?$/.test(filename) ||
    mimeType.includes('presentation') ||
    mimeType.includes('powerpoint')
  ) {
    return { Icon: FaFilePowerpoint, colorClassName: 'text-orange-600' };
  }

  return { Icon: FaFileLines, colorClassName: 'text-slate-500' };
}

function getMediaPreviewVisual(
  mediaType: MediaPreviewMessageType | null,
  message: ChatConversation['lastMessage'],
) {
  if (!mediaType) {
    return null;
  }

  if (mediaType === 'document') {
    return message ? getDocumentPreviewVisual(message) : null;
  }

  return mediaPreviewVisuals[mediaType];
}

export function getConversationStatusLabel(
  adminTakeover: boolean,
  t: (key: string) => string,
) {
  return adminTakeover ? t('statusAdmin') : t('statusAiAgent');
}

export function shouldHighlightAdminConversation(params: {
  adminTakeover: boolean;
  unreadCount: number;
}) {
  const { adminTakeover, unreadCount } = params;
  return adminTakeover && Number.isFinite(unreadCount) && unreadCount > 0;
}

export function ConversationListItem({
  conversation,
  isActive,
  onSelect,
}: {
  conversation: ChatConversation;
  isActive: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations('Chat.list');
  const unreadCount = Number(conversation.unreadCount ?? 0);
  const hasUnread = Number.isFinite(unreadCount) && unreadCount > 0;
  const requiresAdminResponse = shouldHighlightAdminConversation({
    adminTakeover: conversation.adminTakeover,
    unreadCount,
  });
  const mediaPreviewType =
    conversation.lastMessage &&
    isMediaPreviewMessageType(conversation.lastMessage.type)
      ? conversation.lastMessage.type
      : null;
  const messagePreview = mediaPreviewType
    ? getMediaPreviewLabel(mediaPreviewType)
    : getMessagePreview(conversation.lastMessage);
  const mediaPreviewVisual = getMediaPreviewVisual(
    mediaPreviewType,
    conversation.lastMessage,
  );
  const MediaPreviewIcon = mediaPreviewVisual?.Icon ?? null;
  const statusLabel = getConversationStatusLabel(conversation.adminTakeover, t);

  return (
    <div
      className={cn(
        'group flex w-full min-w-0 overflow-hidden transition-all',
        isActive
          ? 'bg-brand/10 hover:bg-brand/10'
          : 'bg-transparent hover:bg-brand/5',
      )}
    >
      <Button
        variant="unstyled"
        type="button"
        onClick={onSelect}
        aria-label={`Open conversation with ${conversation.displayName}${requiresAdminResponse ? ', requires admin response' : ''}`}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 px-4 py-4 text-left"
      >
        <ConversationAvatar conversation={conversation} size="md" />

        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <div className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight text-foreground/90">
              {conversation.displayName}
            </div>
            <span
              className={cn(
                'shrink-0 text-xs',
                hasUnread
                  ? 'font-semibold text-brand'
                  : 'text-muted-foreground',
              )}
            >
              {formatConversationTimestamp(conversation.lastMessageAt)}
            </span>
          </div>

          <div className="mt-0.5 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 overflow-hidden">
            <p
              className="flex h-4 min-w-0 max-w-full items-center gap-0.5 truncate text-[13px] leading-4 text-muted-foreground"
              title={messagePreview}
            >
              {conversation.lastMessage?.direction === 'outgoing' && (
                <MessageStatus status={conversation.lastMessage.status} />
              )}
              {MediaPreviewIcon ? (
                <span className="inline-flex size-4 shrink-0 items-center justify-center">
                  <MediaPreviewIcon
                    className={cn(
                      'block size-3.5',
                      mediaPreviewVisual?.colorClassName,
                    )}
                  />
                </span>
              ) : null}
              <span className="min-w-0 truncate leading-4 translate-y-px">
                {messagePreview}
              </span>
            </p>

            <div className="flex min-w-fit shrink-0 items-center justify-end gap-1.5">
              <Badge
                className={cn(
                  'px-1.5 py-0.5 text-[11px] font-semibold rounded-xs border hover:opacity-90',
                  conversation.adminTakeover
                    ? 'border-amber-700/50 bg-amber-50 text-amber-700 dark:border-amber-500/50 dark:bg-amber-950/35 dark:text-amber-500'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-100',
                )}
              >
                {statusLabel}
              </Badge>

              {hasUnread && (
                <Badge
                  variant="default"
                  className={cn(
                    'flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-brand-foreground',
                    requiresAdminResponse &&
                      'bg-amber-600 text-white dark:bg-amber-500 dark:text-amber-950',
                  )}
                >
                  {unreadCount}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Button>
    </div>
  );
}
