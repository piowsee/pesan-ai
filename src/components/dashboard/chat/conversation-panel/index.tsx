import { ChatSidebar } from '@/components/dashboard/chat/conversation-panel/chat-sidebar';
import type { ChatConversation, ChatSidebarFilter } from '@/types/chat';

interface ChatConversationPaneProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filter: ChatSidebarFilter;
  onFilterChange: (value: ChatSidebarFilter) => void;
  conversations: ChatConversation[];
  activeConversationId?: string;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onSelectConversation: (conversationId: string) => void;
  showMobileDetail: boolean;
  emptyTitle: string;
  emptyDescription: string;
}

export function ChatConversationPane({
  activeConversationId,
  conversations,
  emptyDescription,
  emptyTitle,
  errorMessage,
  filter,
  isError,
  isLoading,
  onFilterChange,
  onRetry,
  onSearchChange,
  onSelectConversation,
  searchValue,
  showMobileDetail,
}: ChatConversationPaneProps) {
  return (
    <div
      className={`absolute inset-0 z-10 flex h-full w-full flex-col bg-background transition-transform duration-200 ease-out lg:static lg:w-90 lg:shrink-0 lg:translate-x-0 ${showMobileDetail ? '-translate-x-full pointer-events-none lg:pointer-events-auto' : 'translate-x-0'}`}
    >
      <ChatSidebar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        filter={filter}
        onFilterChange={onFilterChange}
        conversations={conversations}
        activeConversationId={activeConversationId}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={onRetry}
        onSelectConversation={onSelectConversation}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />
    </div>
  );
}
