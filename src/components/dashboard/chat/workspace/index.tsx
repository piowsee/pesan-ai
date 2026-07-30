'use client';

import { ChatContactPanel } from '@/components/dashboard/chat/contact-panel';
import { ChatConversationPane } from '@/components/dashboard/chat/conversation-panel';
import { ChatDetailPane } from '@/components/dashboard/chat/detail-panel';
import { ChatWorkspaceHeader } from '@/components/dashboard/chat/header-panel';
import {
  type UnreadDividerSnapshotMap,
  captureUnreadDividerSnapshot,
  clearUnreadDividerSnapshot,
  getUnreadDividerInitialCount,
  removeUnreadDividerSnapshot,
} from '@/components/dashboard/chat/shared/unread-divider';
import {
  CHAT_BASE_PARAM_KEYS,
  CHAT_DETAIL_PARAM_KEYS,
  CHAT_LIST_PARAM_KEYS,
  type ChatStateParamKey,
  type ChatStateParamKeys,
  applyChatSearchParamUpdates,
  buildChatHref,
  clearStoredChatState,
  getChatRouteSelection,
  pickChatSearchParams,
  writeStoredChatState,
} from '@/components/dashboard/chat/workspace/chat-route-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useChatSSE } from '@/hooks/use-chat-sse';
import {
  useConversations,
  useDecrementConversationUnreadCount,
  useMarkAsRead,
  useUpdateAdminTakeover,
} from '@/hooks/use-conversations';
import { useDebounce } from '@/hooks/use-debounce';
import {
  getMediaObjectKeysFromMessageGroups,
  useMessageMediaDownloadUrls,
  useMessages,
  useSendMediaMessage,
  useSendMessage,
} from '@/hooks/use-message';
import { useWabas } from '@/hooks/use-wabas';
import { usePathname, useRouter } from '@/i18n/navigation';
import type { ChatSidebarFilter } from '@/types/chat';
import { useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { toast } from 'sonner';

function isChatSidebarFilter(value: string | null): value is ChatSidebarFilter {
  return value === 'all' || value === 'admin' || value === 'bot';
}

export function ChatWorkspaceSkeleton() {
  return (
    <div className="flex h-full w-full min-w-0 overflow-hidden bg-background">
      <div className="flex h-full w-full shrink-0 flex-col border-r bg-background lg:w-90">
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <Skeleton className="h-10 w-40 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>

        <div className="min-h-0 flex-1">
          <div className="flex flex-col gap-3 px-4 py-4">
            <Skeleton className="h-9 w-full rounded-full" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-12 rounded-full" />
              <Skeleton className="h-8 w-16 rounded-full" />
              <Skeleton className="h-8 w-12 rounded-full" />
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
      </div>

      <div className="hidden min-w-0 flex-1 flex-col bg-background lg:flex">
        <div className="flex h-18 shrink-0 items-center border-b border-border/60 px-4">
          <div className="flex items-center gap-4">
            <Skeleton className="size-10 shrink-0 rounded-full" />
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
  );
}

export function ChatWorkspace() {
  const t = useTranslations('Chat');
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
  const [optimisticSearchParamsString, setOptimisticSearchParamsString] =
    useState(searchParamsString);
  const optimisticSearchParams = useMemo(
    () => new URLSearchParams(optimisticSearchParamsString),
    [optimisticSearchParamsString],
  );
  useEffect(() => {
    setOptimisticSearchParamsString(searchParamsString);
  }, [searchParamsString]);

  const [localSendScrollSignal, setLocalSendScrollSignal] = useState(0);
  const [
    initialUnreadCountByConversation,
    setInitialUnreadCountByConversation,
  ] = useState<UnreadDividerSnapshotMap>({});

  const selectedPhoneNumberId =
    optimisticSearchParams.get('phoneNumberId') || undefined;
  const filter = isChatSidebarFilter(optimisticSearchParams.get('filter'))
    ? (optimisticSearchParams.get('filter') as ChatSidebarFilter)
    : 'all';
  const searchValue = optimisticSearchParams.get('q') ?? '';
  const debouncedSearchValue = useDebounce(searchValue, 400);
  const isContactInfoOpen = optimisticSearchParams.get('panel') === 'contact';
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
      const nextParams = pickChatSearchParams(
        optimisticSearchParamsString,
        keys,
      );
      return applyChatSearchParamUpdates(nextParams, updates);
    },
    [optimisticSearchParamsString],
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

      setOptimisticSearchParamsString(nextParams.toString());

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

      setOptimisticSearchParamsString(nextParams.toString());

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
    if (!hasNoWabas) {
      return;
    }

    clearStoredChatState();

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
    // Only persist once a waba is actually selected, so nav entries (e.g. the
    // sidebar's "Chat" link) can send the user back to the last conversation
    // they were viewing, similar to how Discord remembers the last channel
    // open in a server. Skip (rather than clear) when there's no active
    // waba, so an explicit deep link to the bare `/dashboard/chat` route
    // doesn't wipe out a previously stored session.
    if (!activeWabaId) {
      return;
    }

    const persistedParams = pickChatSearchParams(
      searchParamsString,
      CHAT_DETAIL_PARAM_KEYS,
    );

    writeStoredChatState({
      wabaId: activeWabaId,
      convId: selectedConversationId,
      params: persistedParams.toString(),
    });
  }, [activeWabaId, searchParamsString, selectedConversationId]);

  const {
    data: convData,
    isLoading: isConversationsLoading,
    isPlaceholderData: isConversationsPlaceholderData,
    isError: isConversationsError,
    error: conversationsError,
    refetch,
  } = useConversations(activeWabaId);

  const inlineSelectedConversation = convData?.chats?.find(
    (c) => c.id === selectedConversationId,
  );
  const selectedInitialUnreadCountForMessages = getUnreadDividerInitialCount({
    conversationId: selectedConversationId,
    conversationUnreadCount: inlineSelectedConversation?.unreadCount,
    snapshotByConversation: initialUnreadCountByConversation,
  });

  const {
    data: groupedMessages,
    isLoading: isMessagesLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useMessages(
    activeWabaId,
    selectedConversationId,
    selectedInitialUnreadCountForMessages,
  );

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
          c.contactIdentifier.toLowerCase().includes(q),
      );
    }

    return result;
  }, [allConversations, selectedPhoneNumberId, filter, debouncedSearchValue]);

  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return undefined;
    return allConversations.find((c) => c.id === selectedConversationId);
  }, [allConversations, selectedConversationId]);

  useEffect(() => {
    if (isWabasLoading) {
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
    wabas,
  ]);

  const messages = useMemo(() => groupedMessages ?? [], [groupedMessages]);
  const mediaObjectKeys = useMemo(
    () => getMediaObjectKeysFromMessageGroups(messages),
    [messages],
  );
  const {
    data: mediaDownloadUrls = {},
    error: mediaDownloadUrlsError,
    isError: isMediaDownloadUrlsError,
    isStale: areMediaDownloadUrlsStale,
    refetch: refetchMediaDownloadUrls,
  } = useMessageMediaDownloadUrls({
    wabaId: activeWabaId,
    convId: selectedConversationId,
    keys: mediaObjectKeys,
    enabled: !isMessagesLoading,
  });
  const refreshMediaDownloadUrls = useCallback(
    async () => (await refetchMediaDownloadUrls()).data,
    [refetchMediaDownloadUrls],
  );
  const shouldShowConversationListSkeleton =
    Boolean(activeWabaId) &&
    (isConversationsLoading || isConversationsPlaceholderData);

  const selectedInitialUnreadCount = getUnreadDividerInitialCount({
    conversationId: selectedConversationId,
    conversationUnreadCount: selectedConversation?.unreadCount,
    snapshotByConversation: initialUnreadCountByConversation,
  });
  const selectedUnreadCount = Number(selectedConversation?.unreadCount ?? 0);

  const showMobileDetail = Boolean(selectedConversationId);
  const { mutate: markAsRead } = useMarkAsRead();
  const decrementConversationUnreadCount =
    useDecrementConversationUnreadCount();
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

      if (selectedConversationId && selectedConversationId !== conversationId) {
        setInitialUnreadCountByConversation((current) =>
          removeUnreadDividerSnapshot({
            conversationId: selectedConversationId,
            snapshotByConversation: current,
          }),
        );
      }

      setInitialUnreadCountByConversation((current) =>
        captureUnreadDividerSnapshot({
          conversationId,
          snapshotByConversation: current,
          unreadCount,
        }),
      );

      pushChatRoute({
        wabaId: activeWabaId,
        conversationId,
        keys: CHAT_DETAIL_PARAM_KEYS,
        updates: { panel: undefined },
      });
    },
    [activeWabaId, allConversations, pushChatRoute, selectedConversationId],
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
                ? t('takeover.enabled')
                : t('takeover.disabled'),
            );
          },
          onError: (error) => {
            toast.error(error.message || t('takeover.error'));
          },
        },
      );
    },
    [activeWabaId, updateAdminTakeover, t],
  );

  const { mutate: sendMessage } = useSendMessage();
  const { mutate: sendMediaMessage } = useSendMediaMessage();

  const handleClearUnread = useCallback(() => {
    if (!selectedConversationId || !activeWabaId) {
      return;
    }

    setInitialUnreadCountByConversation((current) =>
      clearUnreadDividerSnapshot({
        conversationId: selectedConversationId,
        snapshotByConversation: current,
      }),
    );

    if (selectedUnreadCount > 0) {
      markAsRead({
        wabaId: activeWabaId,
        convId: selectedConversationId,
      });
    }
  }, [activeWabaId, markAsRead, selectedConversationId, selectedUnreadCount]);

  const handleUnreadMessagesViewed = useCallback(
    (viewedCount: number) => {
      if (
        !selectedConversationId ||
        !activeWabaId ||
        selectedUnreadCount <= 0 ||
        viewedCount <= 0
      ) {
        return;
      }

      if (viewedCount >= selectedUnreadCount) {
        markAsRead({
          wabaId: activeWabaId,
          convId: selectedConversationId,
        });
        return;
      }

      decrementConversationUnreadCount({
        wabaId: activeWabaId,
        convId: selectedConversationId,
        viewedCount,
      });
    },
    [
      activeWabaId,
      decrementConversationUnreadCount,
      markAsRead,
      selectedConversationId,
      selectedUnreadCount,
    ],
  );

  const handleSendMessage = useCallback(
    (content: string) => {
      if (!selectedConversationId || !activeWabaId) return;

      handleClearUnread();
      setLocalSendScrollSignal((value) => value + 1);
      sendMessage({
        wabaId: activeWabaId,
        convId: selectedConversationId,
        content,
      });
    },
    [activeWabaId, handleClearUnread, selectedConversationId, sendMessage],
  );

  const handleSendMediaMessage = useCallback(
    ({ files }: { files: Array<{ file: File; caption?: string }> }) => {
      if (!selectedConversationId || !activeWabaId || files.length === 0)
        return;

      handleClearUnread();
      setLocalSendScrollSignal((value) => value + 1);
      sendMediaMessage({
        wabaId: activeWabaId,
        convId: selectedConversationId,
        files,
      });
    },
    [activeWabaId, handleClearUnread, selectedConversationId, sendMediaMessage],
  );

  const isWaitingForInitialWaba = isWabasLoading && !data;
  const shouldShowWorkspaceSkeleton = isWaitingForInitialWaba;

  if (shouldShowWorkspaceSkeleton) {
    return <ChatWorkspaceSkeleton />;
  }

  return (
    <div
      className="relative flex h-full w-full min-w-0 overflow-hidden bg-background"
      style={{ contain: 'strict' }}
    >
      <div className="relative z-10 flex h-full w-full shrink-0 flex-col bg-background lg:w-90">
        <ChatWorkspaceHeader
          wabas={wabas}
          activeWabaId={activeWaba?.id}
          phoneNumbers={phoneNumbers}
          selectedPhoneNumberId={selectedPhoneNumberId}
          onSelectWaba={(wabaId) => {
            pushChatRoute({
              wabaId,
              keys: CHAT_LIST_PARAM_KEYS,
              updates: { panel: undefined },
            });
          }}
          onPhoneNumberChange={(value) => {
            replaceChatSearchState({ phoneNumberId: value });
          }}
        />

        <div className="relative min-h-0 flex-1">
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
            conversations={filteredConversations}
            activeConversationId={selectedConversationId}
            isLoading={shouldShowConversationListSkeleton}
            isError={Boolean(activeWabaId) && isConversationsError}
            errorMessage={conversationsError?.message}
            onRetry={() => {
              if (activeWabaId) {
                void refetch();
              }
            }}
            onSelectConversation={handleSelectConversation}
            showMobileDetail={showMobileDetail}
            emptyTitle={
              activeWabaId ? t('empty.noConversations') : t('empty.selectWaba')
            }
            emptyDescription={
              activeWabaId
                ? t('empty.noConversationsDesc')
                : t('empty.selectWabaDesc')
            }
          />
        </div>

        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 z-20 hidden w-px bg-border lg:block"
        />
      </div>

      <ChatDetailPane
        selectedConversationId={selectedConversationId}
        conversation={selectedConversation}
        activeWabaId={activeWabaId}
        messages={messages}
        mediaDownloadUrls={mediaDownloadUrls}
        mediaDownloadUrlsError={mediaDownloadUrlsError}
        isMediaDownloadUrlsError={isMediaDownloadUrlsError}
        areMediaDownloadUrlsStale={areMediaDownloadUrlsStale}
        onRefreshMediaDownloadUrls={refreshMediaDownloadUrls}
        isConversationLoading={isConversationsLoading}
        isMessagesLoading={isMessagesLoading}
        hasNextPage={Boolean(hasNextPage)}
        isFetchingNextPage={isFetchingNextPage}
        onLoadOlder={() => {
          if (hasNextPage) {
            void fetchNextPage();
          }
        }}
        localSendScrollSignal={localSendScrollSignal}
        initialUnreadCount={selectedInitialUnreadCount}
        unreadCount={selectedUnreadCount}
        onClearUnread={handleClearUnread}
        onUnreadMessagesViewed={handleUnreadMessagesViewed}
        onSend={handleSendMessage}
        onSendMedia={handleSendMediaMessage}
        showMobileDetail={showMobileDetail}
        isContactInfoOpen={isContactInfoOpen}
        onBack={() => {
          if (selectedConversationId) {
            setInitialUnreadCountByConversation((current) =>
              removeUnreadDividerSnapshot({
                conversationId: selectedConversationId,
                snapshotByConversation: current,
              }),
            );
          }
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
        onToggleTakeover={handleToggleTakeover}
        pendingTakeoverConversationId={pendingTakeoverConversationId}
      />

      <ChatContactPanel
        conversation={selectedConversation}
        isOpen={isContactInfoOpen}
        wabaId={activeWabaId}
        onClose={() => {
          replaceChatSearchState({ panel: undefined });
        }}
        showMobileBackButton={showMobileDetail}
      />
    </div>
  );
}
