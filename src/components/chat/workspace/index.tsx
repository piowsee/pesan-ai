'use client';

import { ChatContactPanel } from '@/components/chat/contact-panel';
import { ChatConversationPane } from '@/components/chat/conversation-panel';
import { ChatDetailPane } from '@/components/chat/detail-panel';
import { ChatWorkspaceHeader } from '@/components/chat/header-panel';
import {
  CHAT_BASE_PARAM_KEYS,
  CHAT_DETAIL_PARAM_KEYS,
  CHAT_LIST_PARAM_KEYS,
  type ChatStateParamKey,
  type ChatStateParamKeys,
  applyChatSearchParamUpdates,
  buildChatHref,
  getChatRouteSelection,
  pickChatSearchParams,
} from '@/components/chat/workspace/chat-route-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useChatSSE } from '@/hooks/use-chat-sse';
import {
  useConversations,
  useMarkAsRead,
  useUpdateAdminTakeover,
} from '@/hooks/use-conversations';
import { useDebounce } from '@/hooks/use-debounce';
import {
  useMessages,
  useSendMediaMessage,
  useSendMessage,
} from '@/hooks/use-message';
import { useWabas } from '@/hooks/use-wabas';
import type { ChatSidebarFilter } from '@/types/chat';
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

const CHAT_STATE_STORAGE_KEY = 'dashboard-chat-state';

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
  const params = useParams<{ chatSegments?: string[] }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasInvalidRouteDepth, selectedConversationId, selectedWabaId } =
    getChatRouteSelection(params.chatSegments);
  const {
    data,
    isLoading: isWabasLoading,
    isError: isWabasError,
  } = useWabas(1, 100);
  const wabas = useMemo(() => data?.wabas ?? [], [data?.wabas]);
  const searchParamsString = searchParams.toString();
  const hasSecondaryStateInUrl = CHAT_DETAIL_PARAM_KEYS.some((key) =>
    searchParams.has(key),
  );

  const [initialStoredChatState] = useState(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    return window.localStorage.getItem(CHAT_STATE_STORAGE_KEY) ?? '';
  });

  const canRestoreFromStorageRef = useRef(!hasSecondaryStateInUrl);
  const sanitizedInitialStoredChatState = useMemo(
    () => pickChatSearchParams(initialStoredChatState, CHAT_DETAIL_PARAM_KEYS),
    [initialStoredChatState],
  );
  const [localSendScrollSignal, setLocalSendScrollSignal] = useState(0);
  const [
    initialUnreadCountByConversation,
    setInitialUnreadCountByConversation,
  ] = useState<Record<string, number>>({});
  const [contactDetailsByConversation, setContactDetailsByConversation] =
    useState<Record<string, { label: string; notes: string }>>({});

  const selectedPhoneNumberId = searchParams.get('phoneNumberId') || undefined;
  const filter = isChatSidebarFilter(searchParams.get('filter'))
    ? (searchParams.get('filter') as ChatSidebarFilter)
    : 'all';
  const searchValue = searchParams.get('q') ?? '';
  const debouncedSearchValue = useDebounce(searchValue, 400);
  const isContactInfoOpen = searchParams.get('panel') === 'contact';
  const hasStoredChatState =
    sanitizedInitialStoredChatState.toString().length > 0;
  const hasNoWabas =
    !isWabasLoading && !isWabasError && (data?.total ?? 0) === 0;
  const activeWabaId = selectedWabaId;

  const currentHref = useMemo(
    () => (searchParamsString ? `${pathname}?${searchParamsString}` : pathname),
    [pathname, searchParamsString],
  );

  const createUpdatedSearchParams = useCallback(
    (
      updates: Partial<Record<ChatStateParamKey, string | undefined>>,
      keys: ChatStateParamKeys,
    ) => {
      const nextParams = pickChatSearchParams(searchParamsString, keys);
      return applyChatSearchParamUpdates(nextParams, updates);
    },
    [searchParamsString],
  );

  const replaceChatSearchState = useCallback(
    (
      updates: Partial<Record<ChatStateParamKey, string | undefined>>,
      keys: ChatStateParamKeys = selectedConversationId
        ? CHAT_DETAIL_PARAM_KEYS
        : CHAT_LIST_PARAM_KEYS,
    ) => {
      const nextParams = createUpdatedSearchParams(updates, keys);
      const nextHref = buildChatHref({
        wabaId: activeWabaId,
        conversationId: selectedConversationId,
        searchParams: nextParams,
      });

      if (nextHref === currentHref) {
        return;
      }

      startTransition(() => {
        router.replace(nextHref, { scroll: false });
      });
    },
    [
      activeWabaId,
      createUpdatedSearchParams,
      currentHref,
      router,
      selectedConversationId,
    ],
  );

  const pushChatRoute = useCallback(
    ({
      conversationId,
      keys,
      updates = {},
      wabaId,
    }: {
      wabaId?: string;
      conversationId?: string;
      keys: ChatStateParamKeys;
      updates?: Partial<Record<ChatStateParamKey, string | undefined>>;
    }) => {
      const nextParams = createUpdatedSearchParams(updates, keys);
      const nextHref = buildChatHref({
        wabaId,
        conversationId,
        searchParams: nextParams,
      });

      if (nextHref === currentHref) {
        return;
      }

      startTransition(() => {
        router.push(nextHref, { scroll: false });
      });
    },
    [createUpdatedSearchParams, currentHref, router],
  );

  useEffect(() => {
    if (!hasInvalidRouteDepth) {
      return;
    }

    const nextParams = pickChatSearchParams(
      searchParamsString,
      CHAT_DETAIL_PARAM_KEYS,
    );
    const nextHref = buildChatHref({
      wabaId: selectedWabaId,
      conversationId: selectedConversationId,
      searchParams: nextParams,
    });

    if (nextHref === currentHref) {
      return;
    }

    startTransition(() => {
      router.replace(nextHref, { scroll: false });
    });
  }, [
    currentHref,
    hasInvalidRouteDepth,
    router,
    searchParamsString,
    selectedConversationId,
    selectedWabaId,
  ]);

  useEffect(() => {
    const shouldRestoreFromStorage =
      canRestoreFromStorageRef.current &&
      !hasSecondaryStateInUrl &&
      hasStoredChatState;

    if (hasNoWabas || !shouldRestoreFromStorage) {
      return;
    }

    canRestoreFromStorageRef.current = false;

    const nextHref = buildChatHref({
      wabaId: activeWabaId,
      conversationId: selectedConversationId,
      searchParams: sanitizedInitialStoredChatState,
    });

    if (nextHref === currentHref) {
      return;
    }

    startTransition(() => {
      router.replace(nextHref, { scroll: false });
    });
  }, [
    activeWabaId,
    currentHref,
    hasNoWabas,
    hasSecondaryStateInUrl,
    hasStoredChatState,
    router,
    sanitizedInitialStoredChatState,
    selectedConversationId,
  ]);

  useEffect(() => {
    if (!hasNoWabas) {
      return;
    }

    window.localStorage.removeItem(CHAT_STATE_STORAGE_KEY);

    const nextParams = pickChatSearchParams(
      searchParamsString,
      CHAT_BASE_PARAM_KEYS,
    );
    const nextHref = buildChatHref({ searchParams: nextParams });

    if (nextHref !== currentHref) {
      startTransition(() => {
        router.replace(nextHref, { scroll: false });
      });
    }
  }, [currentHref, hasNoWabas, router, searchParamsString]);

  useEffect(() => {
    const persistedParams = pickChatSearchParams(
      searchParamsString,
      CHAT_DETAIL_PARAM_KEYS,
    );
    const persistedParamsString = persistedParams.toString();

    if (persistedParamsString) {
      window.localStorage.setItem(
        CHAT_STATE_STORAGE_KEY,
        persistedParamsString,
      );
    } else {
      window.localStorage.removeItem(CHAT_STATE_STORAGE_KEY);
    }
  }, [searchParamsString]);

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
    const shouldRestoreFromStorage =
      canRestoreFromStorageRef.current &&
      !hasSecondaryStateInUrl &&
      hasStoredChatState;

    if (shouldRestoreFromStorage || isWabasLoading) {
      return;
    }

    if (activeWabaId && !wabas.some((waba) => waba.id === activeWabaId)) {
      const nextParams = pickChatSearchParams(
        searchParamsString,
        CHAT_BASE_PARAM_KEYS,
      );
      const nextHref = buildChatHref({ searchParams: nextParams });

      if (nextHref !== currentHref) {
        startTransition(() => {
          router.replace(nextHref, { scroll: false });
        });
      }
      return;
    }

    if (selectedConversationId && convData && !selectedConversation) {
      const nextParams = pickChatSearchParams(
        searchParamsString,
        CHAT_LIST_PARAM_KEYS,
      );
      const nextHref = buildChatHref({
        wabaId: activeWabaId,
        searchParams: nextParams,
      });

      if (nextHref !== currentHref) {
        startTransition(() => {
          router.replace(nextHref, { scroll: false });
        });
      }
      return;
    }

    const nextState: Partial<Record<ChatStateParamKey, string | undefined>> =
      {};

    if (
      selectedPhoneNumberId &&
      (!activeWabaId ||
        !phoneNumbers.some(
          (phoneNumber) => phoneNumber.id === selectedPhoneNumberId,
        ))
    ) {
      nextState.phoneNumberId = undefined;
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

    replaceChatSearchState(nextState);
  }, [
    activeWabaId,
    convData,
    currentHref,
    isContactInfoOpen,
    isWabasLoading,
    phoneNumbers,
    replaceChatSearchState,
    router,
    searchParams,
    searchParamsString,
    selectedConversation,
    selectedConversationId,
    selectedPhoneNumberId,
    hasSecondaryStateInUrl,
    hasStoredChatState,
    wabas,
  ]);

  const messages = useMemo(() => groupedMessages ?? [], [groupedMessages]);

  const selectedContactDraft = selectedConversation
    ? (contactDetailsByConversation[selectedConversation.id] ?? {
        label: '',
        notes: '',
      })
    : { label: '', notes: '' };
  const selectedInitialUnreadCount = selectedConversationId
    ? (initialUnreadCountByConversation[selectedConversationId] ??
      selectedConversation?.unreadCount ??
      0)
    : 0;

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
      const conversation = allConversations.find(
        (c) => c.id === conversationId,
      );
      const unreadCount = Number(conversation?.unreadCount ?? 0);

      setInitialUnreadCountByConversation((current) => {
        if (unreadCount > 0) {
          return { ...current, [conversationId]: unreadCount };
        }

        const next = { ...current };
        delete next[conversationId];
        return next;
      });

      pushChatRoute({
        wabaId: activeWabaId,
        conversationId,
        keys: CHAT_DETAIL_PARAM_KEYS,
        updates: { panel: undefined },
      });

      if (activeWabaId && unreadCount > 0) {
        markAsRead({ wabaId: activeWabaId, convId: conversationId });
      }
    },
    [activeWabaId, allConversations, markAsRead, pushChatRoute],
  );

  useEffect(() => {
    if (
      !activeWabaId ||
      !selectedConversation ||
      selectedInitialUnreadCount > 0
    ) {
      return;
    }

    const unreadCount = Number(selectedConversation.unreadCount ?? 0);
    if (unreadCount <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setInitialUnreadCountByConversation((current) => ({
        ...current,
        [selectedConversation.id]: unreadCount,
      }));
      markAsRead({ wabaId: activeWabaId, convId: selectedConversation.id });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    activeWabaId,
    markAsRead,
    selectedConversation,
    selectedInitialUnreadCount,
  ]);

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

  const { mutate: sendMessage } = useSendMessage();
  const { mutate: sendMediaMessage } = useSendMediaMessage();

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

  const handleSendMediaMessage = useCallback(
    ({ caption, file }: { file: File; caption?: string }) => {
      if (!selectedConversationId || !activeWabaId) return;

      setLocalSendScrollSignal((value) => value + 1);
      sendMediaMessage({
        wabaId: activeWabaId,
        convId: selectedConversationId,
        file,
        caption,
      });
    },
    [activeWabaId, selectedConversationId, sendMediaMessage],
  );

  const isWaitingForInitialWaba = isWabasLoading && !data;
  const shouldShowWorkspaceSkeleton = isWaitingForInitialWaba;

  if (shouldShowWorkspaceSkeleton) {
    return <ChatWorkspaceSkeleton />;
  }

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-background">
      <ChatWorkspaceHeader
        wabas={wabas}
        activeWabaId={activeWaba?.id}
        onSelectWaba={(wabaId) => {
          pushChatRoute({
            wabaId,
            keys: CHAT_LIST_PARAM_KEYS,
            updates: { panel: undefined },
          });
        }}
      />

      <div
        className="relative flex min-h-0 flex-1 overflow-hidden bg-background"
        style={{ contain: 'strict' }}
      >
        <ChatConversationPane
          searchValue={searchValue}
          onSearchChange={(value) => {
            replaceChatSearchState({ q: value.trim() ? value : undefined });
          }}
          filter={filter}
          onFilterChange={(value) => {
            replaceChatSearchState({
              filter: value === 'all' ? undefined : value,
            });
          }}
          phoneNumbers={phoneNumbers}
          selectedPhoneNumberId={selectedPhoneNumberId}
          onPhoneNumberChange={(value) => {
            replaceChatSearchState({ phoneNumberId: value });
          }}
          conversations={filteredConversations}
          activeConversationId={selectedConversationId}
          isLoading={Boolean(activeWabaId) && isConversationsLoading}
          isError={Boolean(activeWabaId) && isConversationsError}
          errorMessage={conversationsError?.message}
          onRetry={() => {
            if (activeWabaId) {
              void refetch();
            }
          }}
          onSelectConversation={handleSelectConversation}
          onToggleTakeover={handleToggleTakeover}
          pendingTakeoverConversationId={pendingTakeoverConversationId}
          showMobileDetail={showMobileDetail}
          emptyTitle={activeWabaId ? 'No conversations found' : 'Select a WABA'}
          emptyDescription={
            activeWabaId
              ? 'Try another WABA, adjust the filters, or wait for new customer messages.'
              : 'Choose a WhatsApp Business Account to load its conversations.'
          }
        />

        <ChatDetailPane
          selectedConversationId={selectedConversationId}
          conversation={selectedConversation}
          activeWabaId={activeWabaId}
          messages={messages}
          isLoading={isConversationsLoading || isMessagesLoading}
          hasNextPage={Boolean(hasNextPage)}
          isFetchingNextPage={isFetchingNextPage}
          onLoadOlder={() => {
            if (hasNextPage) {
              void fetchNextPage();
            }
          }}
          localSendScrollSignal={localSendScrollSignal}
          initialUnreadCount={selectedInitialUnreadCount}
          onSend={handleSendMessage}
          onSendMedia={handleSendMediaMessage}
          showMobileDetail={showMobileDetail}
          isContactInfoOpen={isContactInfoOpen}
          onBack={() => {
            pushChatRoute({
              wabaId: activeWabaId,
              keys: CHAT_LIST_PARAM_KEYS,
              updates: { panel: undefined },
            });
          }}
          onContactAreaClick={() => {
            replaceChatSearchState({
              panel: isContactInfoOpen ? undefined : 'contact',
            });
          }}
        />

        <ChatContactPanel
          conversation={selectedConversation}
          isOpen={isContactInfoOpen}
          draft={selectedContactDraft}
          onDraftChange={(draft) => {
            if (!selectedConversation) {
              return;
            }

            setContactDetailsByConversation((prev) => ({
              ...prev,
              [selectedConversation.id]: draft,
            }));
          }}
          onClose={() => {
            replaceChatSearchState({ panel: undefined });
          }}
          showMobileBackButton={showMobileDetail}
        />
      </div>
    </div>
  );
}
