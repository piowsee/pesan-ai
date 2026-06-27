'use client';

import { ChatDetail } from '@/components/chat/chat-detail';
import { ChatEmptyState } from '@/components/chat/chat-empty-state';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ContactInfoPanel } from '@/components/chat/contact-info-panel';
import { WabaSwitcher } from '@/components/chat/waba-switcher';
import { Skeleton } from '@/components/ui/skeleton';
import { useChatSSE } from '@/hooks/use-chat-sse';
import {
  useConversations,
  useMarkAsRead,
  useUpdateAdminTakeover,
} from '@/hooks/use-conversations';
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
import { toast } from 'sonner';

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

export function ChatWorkspaceSkeleton() {
  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-background">
      <div className="shrink-0 border-b border-brand/15 bg-background">
        <div className="flex h-15 items-center px-4">
          <Skeleton className="ml-4 h-8 w-40 rounded-md" />
        </div>
      </div>

      <div
        className="relative flex min-h-0 flex-1 overflow-hidden bg-background"
        style={{ contain: 'strict' }}
      >
        <div className="hidden h-full w-95 shrink-0 border-r border-brand/10 bg-background lg:flex lg:flex-col">
          <div className="flex flex-col gap-3 px-4 py-4">
            <Skeleton className="h-9 w-full rounded-full" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-12 rounded-full" />
              <Skeleton className="h-8 w-16 rounded-full" />
              <Skeleton className="h-8 w-12 rounded-full" />
              <Skeleton className="ml-auto h-8 w-28 rounded-full" />
            </div>
          </div>

          <div className="flex flex-1 flex-col">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="flex gap-3 px-4 py-3">
                <Skeleton className="size-11 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col justify-center gap-2">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-3 w-44 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col bg-brand/5">
          <div className="border-b bg-background px-6 py-4">
            <div className="flex items-center gap-4">
              <Skeleton className="size-11 shrink-0 rounded-full" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-40 rounded-md" />
                <Skeleton className="h-3 w-32 rounded-md" />
              </div>
            </div>
          </div>

          <div className="flex-1 px-4 py-4 lg:px-6">
            <div className="flex flex-col gap-4">
              {Array.from({ length: 7 }).map((_, index) => (
                <div
                  key={index}
                  className={
                    index % 2 === 0 ? 'flex justify-start' : 'flex justify-end'
                  }
                >
                  <Skeleton className="h-20 w-[min(24rem,75%)] rounded-[20px]" />
                </div>
              ))}
            </div>
          </div>

          <div className="shrink-0 px-4 py-4 lg:px-6">
            <Skeleton className="h-16 w-full rounded-[18px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChatWorkspace() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    data,
    isLoading: isWabasLoading,
    isError: isWabasError,
  } = useWabas(1, 100);
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
  const hasNoWabas =
    !isWabasLoading && !isWabasError && (data?.total ?? 0) === 0;
  const activeWabaId = shouldRestoreFromStorage
    ? undefined
    : hasNoWabas
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
    if (hasNoWabas) {
      return;
    }

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
  }, [
    hasNoWabas,
    hasPersistedStateInUrl,
    initialStoredChatState,
    pathname,
    router,
  ]);

  useEffect(() => {
    if (!hasNoWabas) {
      return;
    }

    window.localStorage.removeItem(CHAT_STATE_STORAGE_KEY);

    if (hasPersistedStateInUrl) {
      startTransition(() => {
        router.replace(pathname, { scroll: false });
      });
    }
  }, [hasNoWabas, hasPersistedStateInUrl, pathname, router]);

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
    // Don't normalize while WABAs are still loading — wabas[] is empty during
    // the fetch, which causes the requestedWabaId validity check to wrongly
    // fail and set nextState.wabaId to a value already present in the URL.
    if (shouldRestoreFromStorage || !activeWabaId || isWabasLoading) {
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

    if (Object.keys(nextState).length === 0) {
      return;
    }

    // Only call router.replace when the resulting URL actually differs from
    // the current one — router.replace() with an identical href still triggers
    // a fresh route request in the Next.js App Router.
    const nextParams = new URLSearchParams(searchParamsString);
    Object.entries(nextState).forEach(([key, value]) => {
      if (value) {
        nextParams.set(key, value);
      } else {
        nextParams.delete(key);
      }
    });
    if (nextParams.toString() !== searchParamsString) {
      replaceChatState(nextState);
    }
  }, [
    activeWabaId,
    convData,
    isContactInfoOpen,
    isWabasLoading,
    phoneNumbers,
    replaceChatState,
    requestedWabaId,
    searchParams,
    searchParamsString,
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
  const {
    mutate: updateAdminTakeover,
    isPending: isUpdatingAdminTakeover,
    variables: updateAdminTakeoverVariables,
  } = useUpdateAdminTakeover();
  const pendingTakeoverConversationId = isUpdatingAdminTakeover
    ? updateAdminTakeoverVariables?.conversationId
    : undefined;

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

  const handleToggleTakeover = useCallback(
    (conversationId: string, nextAdminTakeover: boolean) => {
      if (!activeWabaId) return;

      updateAdminTakeover(
        {
          cacheWabaId: activeWabaId,
          conversationId,
          adminTakeover: nextAdminTakeover,
        },
        {
          onSuccess: () => {
            toast.success(
              nextAdminTakeover
                ? 'Admin takeover enabled'
                : 'Conversation returned to bot',
            );
          },
          onError: (error) => {
            toast.error(error.message || 'Failed to update takeover status');
          },
        },
      );
    },
    [activeWabaId, updateAdminTakeover],
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

  const isRestoringPersistedState = shouldRestoreFromStorage && !hasNoWabas;
  const isWaitingForInitialWaba = isWabasLoading && !data;
  const isWaitingForSelectedConversation =
    Boolean(selectedConversationId) && isConversationsLoading && !convData;
  const shouldShowWorkspaceSkeleton =
    isRestoringPersistedState ||
    isWaitingForInitialWaba ||
    isWaitingForSelectedConversation;

  if (shouldShowWorkspaceSkeleton) {
    return <ChatWorkspaceSkeleton />;
  }

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
            onToggleTakeover={handleToggleTakeover}
            pendingTakeoverConversationId={pendingTakeoverConversationId}
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
                title="No chat selected"
                description="Select a conversation from the sidebar to view message history."
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
