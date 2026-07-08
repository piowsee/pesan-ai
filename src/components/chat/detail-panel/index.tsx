import { ChatDetail } from '@/components/chat/detail-panel/chat-detail';
import { ChatEmptyState } from '@/components/chat/shared/chat-empty-state';
import type { MessageGroup } from '@/hooks/use-message';
import type { ChatConversation } from '@/types/chat';
import { InboxIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ChatDetailPaneProps {
  activeWabaId?: string;
  conversation?: ChatConversation;
  selectedConversationId?: string;
  messages: MessageGroup[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadOlder: () => void;
  localSendScrollSignal: number;
  initialUnreadCount: number;
  onSend: (content: string) => void;
  onSendMedia: (input: { file: File; caption?: string }) => void;
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
  isContactInfoOpen,
  isFetchingNextPage,
  isLoading,
  localSendScrollSignal,
  messages,
  onBack,
  onContactAreaClick,
  onLoadOlder,
  onSend,
  onSendMedia,
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
          isLoading={isLoading}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadOlder={onLoadOlder}
          localSendScrollSignal={localSendScrollSignal}
          initialUnreadCount={initialUnreadCount}
          onSend={onSend}
          onSendMedia={onSendMedia}
          showBackButton={showMobileDetail}
          onBack={onBack}
          onContactAreaClick={onContactAreaClick}
          onToggleTakeover={onToggleTakeover}
          pendingTakeoverConversationId={pendingTakeoverConversationId}
        />
      ) : (
        <div className="flex h-full flex-1 items-center justify-center bg-brand/5">
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
