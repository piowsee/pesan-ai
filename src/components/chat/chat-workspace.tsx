'use client';

import { ChatDetail } from '@/components/chat/chat-detail';
import { ChatEmptyState } from '@/components/chat/chat-empty-state';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ContactInfoPanel } from '@/components/chat/contact-info-panel';
import { WabaSwitcher } from '@/components/chat/waba-switcher';
import { useChatSSE } from '@/hooks/use-chat-sse';
import { useConversations, useMarkAsRead } from '@/hooks/use-conversations';
import { useDebounce } from '@/hooks/use-debounce';
import { useMessages, useSendMessage } from '@/hooks/use-message';
import { useWabas } from '@/hooks/use-wabas';
import type { ChatSidebarFilter } from '@/types/chat';
import { InboxIcon } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

const CHAT_STATE_STORAGE_KEY = 'dashboard-chat-state';
const CHAT_STATE_PARAM_KEYS = [
  'wabaId',
  'conversationId',
  'filter',
  'phoneNumberId',
  'q',
  'panel',
] as const;

type ChatStateParamKey = (typeof CHAT_STATE_PARAM_KEYS)[number];

function isChatSidebarFilter(value: string | null): value is ChatSidebarFilter {
  return value === 'all' || value === 'admin' || value === 'bot';
}

export function ChatWorkspace() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data } = useWabas(1, 100);
  const wabas = useMemo(() => data?.wabas ?? [], [data?.wabas]);
  const searchParamsString = searchParams.toString();
  const hasPersistedStateInUrl = CHAT_STATE_PARAM_KEYS.some((key) =>
    searchParams.has(key),
  );

  const [initialStoredChatState] = useState(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    return window.localStorage.getItem(CHAT_STATE_STORAGE_KEY) ?? '';
  });
  const [localSendScrollSignal, setLocalSendScrollSignal] = useState(0);
  const [contactDetailsByConversation, setContactDetailsByConversation] =
    useState<Record<string, { label: string; notes: string }>>({});

  const requestedWabaId = searchParams.get('wabaId') || undefined;
  const selectedConversationId =
    searchParams.get('conversationId') || undefined;
  const selectedPhoneNumberId = searchParams.get('phoneNumberId') || undefined;
  const filter = isChatSidebarFilter(searchParams.get('filter'))
    ? (searchParams.get('filter') as ChatSidebarFilter)
    : 'all';
  const searchValue = searchParams.get('q') ?? '';
  const debouncedSearchValue = useDebounce(searchValue, 400);
  const isContactInfoOpen = searchParams.get('panel') === 'contact';
  const shouldRestoreFromStorage =
    !hasPersistedStateInUrl && Boolean(initialStoredChatState);
  const activeWabaId = shouldRestoreFromStorage
    ? undefined
    : (requestedWabaId ?? wabas[0]?.id);

  const replaceChatState = useCallback(
    (updates: Partial<Record<ChatStateParamKey, string | undefined>>) => {
      const nextParams = new URLSearchParams(searchParamsString);

      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          nextParams.set(key, value);
        } else {
          nextParams.delete(key);
        }
      });

      const nextQuery = nextParams.toString();
      const nextHref = nextQuery ? `${pathname}?${nextQuery}` : pathname;

      startTransition(() => {
        router.replace(nextHref, { scroll: false });
      });
    },
    [pathname, router, searchParamsString],
  );

  useEffect(() => {
    if (hasPersistedStateInUrl) {
      return;
    }

    if (!initialStoredChatState) {
      return;
    }

    startTransition(() => {
      router.replace(`${pathname}?${initialStoredChatState}`, {
        scroll: false,
      });
    });
  }, [hasPersistedStateInUrl, initialStoredChatState, pathname, router]);

  useEffect(() => {
    if (!hasPersistedStateInUrl) {
      return;
    }

    const persistedParams = new URLSearchParams();
    const currentSearchParams = new URLSearchParams(searchParamsString);

    CHAT_STATE_PARAM_KEYS.forEach((key) => {
      const value = currentSearchParams.get(key);
      if (value) {
        persistedParams.set(key, value);
      }
    });

    window.localStorage.setItem(
      CHAT_STATE_STORAGE_KEY,
      persistedParams.toString(),
    );
  }, [hasPersistedStateInUrl, searchParamsString]);

  const {
    data: convData,
    isLoading: isConversationsLoading,
    isError: isConversationsError,
    error: conversationsError,
    refetch,
  } = useConversations(activeWabaId);

  const {
    data: groupedMessages,
    isLoading: isMessagesLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useMessages(activeWabaId, selectedConversationId);

  useChatSSE({
    viewingConversationId: selectedConversationId,
  });

  const activeWaba = useMemo(
    () => wabas.find((waba) => waba.id === activeWabaId),
    [activeWabaId, wabas],
  );
  const phoneNumbers = useMemo(
    () => activeWaba?.phoneNumbers ?? [],
    [activeWaba?.phoneNumbers],
  );

  const allConversations = useMemo(
    () => convData?.chats ?? [],
    [convData?.chats],
  );

  const filteredConversations = useMemo(() => {
    let result = allConversations;

    if (selectedPhoneNumberId) {
      result = result.filter((c) => c.phoneNumber.id === selectedPhoneNumberId);
    }

    if (filter === 'admin') {
      result = result.filter((c) => c.adminTakeover === true);
    } else if (filter === 'bot') {
      result = result.filter((c) => c.adminTakeover === false);
    }

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

  useEffect(() => {
    if (shouldRestoreFromStorage || !activeWabaId) {
      return;
    }

    const nextState: Partial<Record<ChatStateParamKey, string | undefined>> =
      {};

    if (
      !requestedWabaId ||
      !wabas.some((waba) => waba.id === requestedWabaId)
    ) {
      nextState.wabaId = activeWabaId;
    }

    if (
      selectedPhoneNumberId &&
      !phoneNumbers.some(
        (phoneNumber) => phoneNumber.id === selectedPhoneNumberId,
      )
    ) {
      nextState.phoneNumberId = undefined;
    }

    if (selectedConversationId && convData && !selectedConversation) {
      nextState.conversationId = undefined;
      nextState.panel = undefined;
    }

    if (!selectedConversationId && isContactInfoOpen) {
      nextState.panel = undefined;
    }

    if (
      searchParams.has('filter') &&
      !isChatSidebarFilter(searchParams.get('filter'))
    ) {
      nextState.filter = undefined;
    }

    if (Object.keys(nextState).length > 0) {
      replaceChatState(nextState);
    }
  }, [
    activeWabaId,
    convData,
    isContactInfoOpen,
    phoneNumbers,
    replaceChatState,
    requestedWabaId,
    searchParams,
    selectedConversation,
    selectedConversationId,
    selectedPhoneNumberId,
    shouldRestoreFromStorage,
    wabas,
  ]);

  const messages = useMemo(() => groupedMessages ?? [], [groupedMessages]);

  const selectedContactDraft = selectedConversation
    ? (contactDetailsByConversation[selectedConversation.id] ?? {
        label: '',
        notes: '',
      })
    : { label: '', notes: '' };

  const showMobileDetail = Boolean(selectedConversationId);
  const { mutate: markAsRead } = useMarkAsRead();

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      replaceChatState({
        wabaId: activeWabaId,
        conversationId,
        panel: undefined,
      });

      if (activeWabaId) {
        const conversation = allConversations.find(
          (c) => c.id === conversationId,
        );
        if (conversation && conversation.unreadCount > 0) {
          markAsRead({ wabaId: activeWabaId, convId: conversationId });
        }
      }
    },
    [activeWabaId, allConversations, markAsRead, replaceChatState],
  );

  const { mutate: sendMessage, isPending: isSending } = useSendMessage();

  const handleSendMessage = useCallback(
    (content: string) => {
      if (!selectedConversationId || !activeWabaId) return;

      setLocalSendScrollSignal((value) => value + 1);
      sendMessage({
        wabaId: activeWabaId,
        convId: selectedConversationId,
        content,
      });
    },
    [activeWabaId, selectedConversationId, sendMessage],
  );

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-background">
      <div className="shrink-0 bg-background z-10 relative border-b border-brand/15">
        <div className="flex h-15 items-center px-4">
          <WabaSwitcher
            wabas={wabas}
            activeWabaId={activeWaba?.id}
            onSelectWaba={(wabaId) => {
              replaceChatState({
                wabaId,
                conversationId: undefined,
                phoneNumberId: undefined,
                panel: undefined,
              });
            }}
          />
        </div>
      </div>

      <div
        className="relative flex min-h-0 flex-1 overflow-hidden bg-background"
        style={{ contain: 'strict' }}
      >
        <div
          className={`absolute inset-0 z-10 flex h-full w-full flex-col bg-background transition-transform duration-200 ease-out lg:static lg:w-95 lg:shrink-0 lg:border-r lg:border-brand/10 lg:translate-x-0 ${showMobileDetail ? '-translate-x-full pointer-events-none lg:pointer-events-auto' : 'translate-x-0'}`}
        >
          <ChatSidebar
            searchValue={searchValue}
            onSearchChange={(value) => {
              replaceChatState({ q: value.trim() ? value : undefined });
            }}
            filter={filter}
            onFilterChange={(value) => {
              replaceChatState({
                filter: value === 'all' ? undefined : value,
              });
            }}
            phoneNumbers={phoneNumbers}
            selectedPhoneNumberId={selectedPhoneNumberId}
            onPhoneNumberChange={(value) => {
              replaceChatState({ phoneNumberId: value });
            }}
            conversations={filteredConversations}
            activeConversationId={selectedConversationId}
            isLoading={isConversationsLoading}
            isError={isConversationsError}
            errorMessage={conversationsError?.message}
            onRetry={() => refetch()}
            onSelectConversation={handleSelectConversation}
          />
        </div>

        <div
          className={`absolute inset-0 z-20 flex min-w-0 flex-1 flex-col bg-background transition-transform duration-200 ease-out lg:static lg:z-0 lg:translate-x-0 ${!showMobileDetail ? 'translate-x-full pointer-events-none' : isContactInfoOpen ? '-translate-x-full pointer-events-none lg:pointer-events-auto' : 'translate-x-0'}`}
        >
          {selectedConversation ? (
            <ChatDetail
              conversation={selectedConversation}
              messages={messages}
              isLoading={isMessagesLoading}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onLoadOlder={() => fetchNextPage()}
              localSendScrollSignal={localSendScrollSignal}
              isSending={isSending}
              onSend={handleSendMessage}
              showBackButton={showMobileDetail}
              onBack={() => {
                replaceChatState({
                  conversationId: undefined,
                  panel: undefined,
                });
              }}
              onContactAreaClick={() => {
                replaceChatState({
                  panel: isContactInfoOpen ? undefined : 'contact',
                });
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
                replaceChatState({ panel: undefined });
              }}
              showMobileBackButton={showMobileDetail}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
