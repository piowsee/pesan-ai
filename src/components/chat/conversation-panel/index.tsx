import { ChatSidebar } from '@/components/chat/conversation-panel/chat-sidebar';
import type { ChatConversation, ChatSidebarFilter } from '@/types/chat';

interface ChatConversationPaneProps {
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
  onRetry: () => void;
  onSelectConversation: (conversationId: string) => void;
  onToggleTakeover: (
    conversationId: string,
    nextAdminTakeover: boolean,
  ) => void;
  pendingTakeoverConversationId?: string;
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
  onPhoneNumberChange,
  onRetry,
  onSearchChange,
  onSelectConversation,
  onToggleTakeover,
  pendingTakeoverConversationId,
  phoneNumbers,
  searchValue,
  selectedPhoneNumberId,
  showMobileDetail,
}: ChatConversationPaneProps) {
  return (
    <div
      className={`absolute inset-0 z-10 flex h-full w-full flex-col bg-background transition-transform duration-200 ease-out lg:static lg:w-95 lg:shrink-0 lg:border-r lg:border-brand/10 lg:translate-x-0 ${showMobileDetail ? '-translate-x-full pointer-events-none lg:pointer-events-auto' : 'translate-x-0'}`}
    >
      <ChatSidebar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        filter={filter}
        onFilterChange={onFilterChange}
        phoneNumbers={phoneNumbers}
        selectedPhoneNumberId={selectedPhoneNumberId}
        onPhoneNumberChange={onPhoneNumberChange}
        conversations={conversations}
        activeConversationId={activeConversationId}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={onRetry}
        onSelectConversation={onSelectConversation}
        onToggleTakeover={onToggleTakeover}
        pendingTakeoverConversationId={pendingTakeoverConversationId}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />
    </div>
  );
}
