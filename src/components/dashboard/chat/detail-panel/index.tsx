import { ChatDetail } from '@/components/dashboard/chat/detail-panel/chat-detail';
import { ChatEmptyState } from '@/components/dashboard/chat/shared/chat-empty-state';
import type {
  MediaDownloadUrlResponse,
  MessageGroup,
} from '@/hooks/use-message';
import type { ChatConversation } from '@/types/chat';
import { InboxIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ChatDetailPaneProps {
  activeWabaId?: string;
  conversation?: ChatConversation;
  selectedConversationId?: string;
  messages: MessageGroup[];
  mediaDownloadUrls: Record<string, MediaDownloadUrlResponse>;
  mediaDownloadUrlsError: unknown;
  isMediaDownloadUrlsError: boolean;
  areMediaDownloadUrlsStale: boolean;
  onRefreshMediaDownloadUrls: () => Promise<
    Record<string, MediaDownloadUrlResponse> | undefined
  >;
  isConversationLoading: boolean;
  isMessagesLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadOlder: () => void;
  localSendScrollSignal: number;
  initialUnreadCount: number;
  unreadCount: number;
  onClearUnread: () => void;
  onUnreadMessagesViewed: (viewedCount: number) => void;
  onSend: (content: string) => void;
  onSendMedia: (input: {
    files: Array<{ file: File; caption?: string }>;
  }) => void;
  showMobileDetail: boolean;
  isContactInfoOpen: boolean;
  onBack: () => void;
  onContactAreaClick: () => void;
  onToggleTakeover: (
    conversationId: string,
    nextAdminTakeover: boolean,
  ) => void;
  pendingTakeoverConversationId?: string;
}

export function ChatDetailPane({
  activeWabaId,
  conversation,
  hasNextPage,
  initialUnreadCount,
  unreadCount,
  isContactInfoOpen,
  isFetchingNextPage,
  isConversationLoading,
  isMessagesLoading,
  localSendScrollSignal,
  messages,
  mediaDownloadUrls,
  mediaDownloadUrlsError,
  isMediaDownloadUrlsError,
  areMediaDownloadUrlsStale,
  onRefreshMediaDownloadUrls,
  onBack,
  onContactAreaClick,
  onClearUnread,
  onLoadOlder,
  onSend,
  onSendMedia,
  onUnreadMessagesViewed,
  selectedConversationId,
  showMobileDetail,
  onToggleTakeover,
  pendingTakeoverConversationId,
}: ChatDetailPaneProps) {
  const t = useTranslations('Chat.detail');
  return (
    <div
      className={`absolute inset-0 z-20 flex min-w-0 flex-1 flex-col bg-background transition-transform duration-200 ease-out lg:static lg:z-0 lg:translate-x-0 ${!showMobileDetail ? 'translate-x-full pointer-events-none' : isContactInfoOpen ? '-translate-x-full pointer-events-none lg:pointer-events-auto' : 'translate-x-0'}`}
    >
      {selectedConversationId ? (
        <ChatDetail
          conversation={conversation}
          wabaId={activeWabaId}
          messages={messages}
          mediaDownloadUrls={mediaDownloadUrls}
          mediaDownloadUrlsError={mediaDownloadUrlsError}
          isMediaDownloadUrlsError={isMediaDownloadUrlsError}
          areMediaDownloadUrlsStale={areMediaDownloadUrlsStale}
          onRefreshMediaDownloadUrls={onRefreshMediaDownloadUrls}
          isConversationLoading={isConversationLoading}
          isMessagesLoading={isMessagesLoading}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadOlder={onLoadOlder}
          localSendScrollSignal={localSendScrollSignal}
          initialUnreadCount={initialUnreadCount}
          unreadCount={unreadCount}
          onClearUnread={onClearUnread}
          onUnreadMessagesViewed={onUnreadMessagesViewed}
          onSend={onSend}
          onSendMedia={onSendMedia}
          showBackButton={showMobileDetail}
          onBack={onBack}
          onContactAreaClick={onContactAreaClick}
          onToggleTakeover={onToggleTakeover}
          pendingTakeoverConversationId={pendingTakeoverConversationId}
          isContactInfoOpen={isContactInfoOpen}
        />
      ) : (
        <div className="flex h-full flex-1 items-center justify-center bg-background">
          <ChatEmptyState
            title={t('emptyTitle')}
            description={t('emptyDesc')}
            icon={InboxIcon}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
