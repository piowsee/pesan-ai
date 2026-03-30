'use client';

import { ChatDetail } from '@/components/chat/chat-detail';
import { ChatEmptyState } from '@/components/chat/chat-empty-state';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ContactInfoPanel } from '@/components/chat/contact-info-panel';
import { WabaSwitcher } from '@/components/chat/waba-switcher';
import { useConversations } from '@/hooks/use-conversations';
import { useDebounce } from '@/hooks/use-debounce';
import { useWabas } from '@/hooks/use-wabas';
import type { ChatMessage, ChatSidebarFilter } from '@/types/chat';
import { InboxIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

// ──────────────────────────────────────────────
// Workspace Component
// ──────────────────────────────────────────────

export function ChatWorkspace() {
  const { data } = useWabas(1, 100);
  const wabas = data?.wabas ?? [];

  // ── State ──
  const [userSelectedWabaId, setUserSelectedWabaId] = useState<
    string | undefined
  >(undefined);
  const activeWabaId = userSelectedWabaId ?? wabas[0]?.id;
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | undefined
  >(undefined);
  const [filter, setFilter] = useState<ChatSidebarFilter>('all');
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearchValue = useDebounce(searchValue, 400);
  const [selectedPhoneNumberId, setSelectedPhoneNumberId] = useState<
    string | undefined
  >(undefined);
  const [isContactInfoOpen, setIsContactInfoOpen] = useState(false);
  const [contactDetailsByConversation, setContactDetailsByConversation] =
    useState<Record<string, { label: string; notes: string }>>({});
  const [extraMessages, setExtraMessages] = useState<
    Record<string, ChatMessage[]>
  >({});

  // ── Queries ──
  const {
    data: msgData,
    isLoading,
    isError,
    error,
    refetch,
  } = useConversations(activeWabaId);

  // ── Derived ──
  const activeWaba = wabas.find((w) => w.id === activeWabaId);
  const phoneNumbers = activeWaba?.phoneNumbers ?? [];

  const allConversations = useMemo(
    () => msgData?.chats ?? [],
    [msgData?.chats],
  );

  const filteredConversations = useMemo(() => {
    let result = allConversations;

    // Filter by phone number locally
    if (selectedPhoneNumberId) {
      result = result.filter((c) => c.phoneNumber.id === selectedPhoneNumberId);
    }

    // Filter by Admin/Bot
    if (filter === 'admin') {
      result = result.filter((c) => c.adminTakeover === true);
    } else if (filter === 'bot') {
      result = result.filter((c) => c.adminTakeover === false);
    }

    // Filter by Search
    const q = debouncedSearchValue.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (c) =>
          c.displayName.toLowerCase().includes(q) ||
          c.customerPhone.toLowerCase().includes(q),
      );
    }

    return result;
  }, [allConversations, selectedPhoneNumberId, filter, debouncedSearchValue]);

  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return undefined;
    return allConversations.find((c) => c.id === selectedConversationId);
  }, [allConversations, selectedConversationId]);

  const messages = useMemo(() => {
    if (!selectedConversationId) return [];
    const base: ChatMessage[] = [];
    const extra = extraMessages[selectedConversationId] ?? [];
    return [...base, ...extra];
  }, [selectedConversationId, extraMessages]);

  const selectedContactDraft = selectedConversation
    ? (contactDetailsByConversation[selectedConversation.id] ?? {
        label: '',
        notes: '',
      })
    : { label: '', notes: '' };

  const showMobileDetail = Boolean(selectedConversationId);

  // ── Handlers ──
  const handleSelectConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
    setIsContactInfoOpen(false);
  }, []);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!selectedConversationId) return;

      const newMessage: ChatMessage = {
        id: `user-msg-${Date.now()}`,
        messageId: `user-msg-${Date.now()}`,
        conversationId: selectedConversationId,
        direction: 'outgoing',
        source: 'admin',
        type: 'text',
        content,
        mediaUrl: null,
        mediaMimeType: null,
        mediaFilename: null,
        mediaSize: null,
        status: 'sent',
        errorMessage: null,
        metadata: null,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      setExtraMessages((prev) => ({
        ...prev,
        [selectedConversationId]: [
          ...(prev[selectedConversationId] ?? []),
          newMessage,
        ],
      }));
    },
    [selectedConversationId],
  );

  // ── Render ──
  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-background">
      <div className="shrink-0 bg-background z-10 relative border-b border-brand/15">
        <div className="flex h-15 items-center px-4">
          <WabaSwitcher
            wabas={wabas}
            activeWabaId={activeWaba?.id}
            onSelectWaba={(wabaId) => {
              setUserSelectedWabaId(wabaId);
              setSelectedConversationId(undefined);
              setSelectedPhoneNumberId(undefined);
            }}
          />
        </div>
      </div>

      <div
        className="relative flex min-h-0 flex-1 overflow-hidden bg-background"
        style={{ contain: 'strict' }}
      >
        {/* Sidebar */}
        <div
          className={`absolute inset-0 z-10 flex h-full w-full flex-col bg-background transition-transform duration-200 ease-out lg:static lg:w-95 lg:shrink-0 lg:border-r lg:border-brand/10 lg:translate-x-0 ${showMobileDetail ? '-translate-x-full pointer-events-none lg:pointer-events-auto' : 'translate-x-0'}`}
        >
          <ChatSidebar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            filter={filter}
            onFilterChange={setFilter}
            phoneNumbers={phoneNumbers}
            selectedPhoneNumberId={selectedPhoneNumberId}
            onPhoneNumberChange={setSelectedPhoneNumberId}
            conversations={filteredConversations}
            activeConversationId={selectedConversationId}
            isLoading={isLoading}
            isError={isError}
            errorMessage={error?.message}
            onRetry={() => refetch()}
            onSelectConversation={handleSelectConversation}
          />
        </div>

        {/* Chat Detail */}
        <div
          className={`absolute inset-0 z-20 flex min-w-0 flex-1 flex-col bg-background transition-transform duration-200 ease-out lg:static lg:z-0 lg:translate-x-0 ${!showMobileDetail ? 'translate-x-full pointer-events-none' : isContactInfoOpen ? '-translate-x-full pointer-events-none lg:pointer-events-auto' : 'translate-x-0'}`}
        >
          {selectedConversation ? (
            <ChatDetail
              conversation={selectedConversation}
              messages={messages}
              isLoading={false}
              hasNextPage={false}
              isFetchingNextPage={false}
              onLoadOlder={() => {}}
              isSending={false}
              onSend={handleSendMessage}
              showBackButton={showMobileDetail}
              onBack={() => {
                setSelectedConversationId(undefined);
              }}
              onContactAreaClick={() => {
                setIsContactInfoOpen((prev) => !prev);
              }}
            />
          ) : (
            <div className="flex h-full flex-1 items-center justify-center bg-brand/5">
              <ChatEmptyState
                title="Belum ada chat dipilih"
                description="Pilih percakapan dari sidebar untuk melihat riwayat pesan."
                icon={InboxIcon}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Contact Info Panel */}
        {selectedConversation && isContactInfoOpen ? (
          <div className="absolute inset-0 z-30 flex flex-col bg-background lg:static lg:z-0 lg:w-95 lg:shrink-0 lg:overflow-hidden lg:border-l lg:border-brand/10">
            <ContactInfoPanel
              conversation={selectedConversation}
              label={selectedContactDraft.label}
              notes={selectedContactDraft.notes}
              onLabelChange={(value) => {
                setContactDetailsByConversation((prev) => ({
                  ...prev,
                  [selectedConversation.id]: {
                    ...selectedContactDraft,
                    label: value,
                  },
                }));
              }}
              onNotesChange={(value) => {
                setContactDetailsByConversation((prev) => ({
                  ...prev,
                  [selectedConversation.id]: {
                    ...selectedContactDraft,
                    notes: value,
                  },
                }));
              }}
              onClose={() => {
                setIsContactInfoOpen(false);
              }}
              showMobileBackButton={showMobileDetail}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
