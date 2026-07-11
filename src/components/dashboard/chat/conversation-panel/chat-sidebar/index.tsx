import { ChatSidebarToolbar } from '@/components/dashboard/chat/conversation-panel/chat-sidebar/chat-sidebar-toolbar';
import { ConversationList } from '@/components/dashboard/chat/conversation-panel/chat-sidebar/conversation-list';
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
  onRetry,
  onSelectConversation,
  onToggleTakeover,
  pendingTakeoverConversationId,
  emptyTitle,
  emptyDescription,
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
  onRetry: () => void;
  onSelectConversation: (conversationId: string) => void;
  onToggleTakeover: (
    conversationId: string,
    nextAdminTakeover: boolean,
  ) => void;
  pendingTakeoverConversationId?: string;
  emptyTitle?: string;
  emptyDescription?: string;
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
      />

      <div className="min-h-0 flex-1">
        <ConversationList
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
    </aside>
  );
}
