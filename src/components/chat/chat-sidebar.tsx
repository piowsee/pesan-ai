import { ChatSidebarToolbar } from '@/components/chat/chat-sidebar-toolbar';
import { ConversationList } from '@/components/chat/conversation-list';
import { cn } from '@/lib/utils';
import type { ChatConversation, ChatSidebarFilter } from '@/types/chat';

export function ChatSidebar({
  className,
  searchValue,
  onSearchChange,
  filter,
  onFilterChange,
  phoneNumbers,
  selectedPhoneNumberId,
  onPhoneNumberChange,
  conversations,
  activeConversationId,
  isLoading,
  isError,
  errorMessage,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onRetry,
  onSelectConversation,
  allCount,
  unreadCount,
}: {
  className?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filter: ChatSidebarFilter;
  onFilterChange: (value: ChatSidebarFilter) => void;
  phoneNumbers: Array<{ id: string; displayPhoneNumber: string }>;
  selectedPhoneNumberId?: string;
  onPhoneNumberChange: (value?: string) => void;
  conversations: ChatConversation[];
  activeConversationId?: string;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  onSelectConversation: (conversationId: string) => void;
  allCount: number;
  unreadCount: number;
}) {
  return (
    <aside className={cn('flex h-full flex-col bg-background', className)}>
      <ChatSidebarToolbar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        filter={filter}
        onFilterChange={onFilterChange}
        phoneNumbers={phoneNumbers}
        selectedPhoneNumberId={selectedPhoneNumberId}
        onPhoneNumberChange={onPhoneNumberChange}
        allCount={allCount}
        unreadCount={unreadCount}
      />

      <div className="min-h-0 flex-1">
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversationId}
          isLoading={isLoading}
          isError={isError}
          errorMessage={errorMessage}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={onLoadMore}
          onRetry={onRetry}
          onSelectConversation={onSelectConversation}
        />
      </div>
    </aside>
  );
}
