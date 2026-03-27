'use client';

import { ChatDetail } from '@/components/chat/chat-detail';
import { ChatEmptyState } from '@/components/chat/chat-empty-state';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { WabaSwitcher } from '@/components/chat/waba-switcher';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useChatEvents,
  useChatMessages,
  useChatWabas,
  useChats,
  useConversation,
  useMarkConversationRead,
  useSendMessage,
} from '@/hooks/use-chats';
import { CHAT_MESSAGE_PAGE_SIZE, CHAT_SIDEBAR_PAGE_SIZE } from '@/lib/chat';
import type {
  ChatConversation,
  ChatConversationListResponse,
  ChatSidebarFilter,
} from '@/types/chat';
import { InboxIcon } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useState,
} from 'react';

function ChatWorkspaceLoading() {
  return (
    <div className="grid min-h-[72vh] gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
      <Skeleton className="h-[72vh] rounded-[30px]" />
      <Skeleton className="h-[72vh] rounded-[30px]" />
    </div>
  );
}

function getFilterValue(value?: string | null): ChatSidebarFilter {
  return value === 'unread' ? 'unread' : 'all';
}

export function ChatWorkspace({
  initialSearchParams,
}: {
  initialSearchParams: {
    wabaId?: string;
    conversationId?: string;
    filter?: string;
    phoneNumberId?: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState('');
  const deferredSearchValue = useDeferredValue(searchValue.trim());

  const resolvedWabaId =
    searchParams.get('wabaId') ?? initialSearchParams.wabaId ?? undefined;
  const resolvedConversationId =
    searchParams.get('conversationId') ??
    initialSearchParams.conversationId ??
    undefined;
  const resolvedFilter = getFilterValue(
    searchParams.get('filter') ?? initialSearchParams.filter,
  );
  const resolvedPhoneNumberId =
    searchParams.get('phoneNumberId') ??
    initialSearchParams.phoneNumberId ??
    undefined;

  const { data: wabas = [], isLoading: isLoadingWabas } = useChatWabas();
  const activeWaba = wabas.find((waba) => waba.id === resolvedWabaId);
  const phoneNumbers = activeWaba?.phoneNumbers ?? [];

  const sidebarInput = activeWaba
    ? {
        wabaId: activeWaba.id,
        filter: resolvedFilter,
        phoneNumberId: resolvedPhoneNumberId,
        q: deferredSearchValue || undefined,
        limit: CHAT_SIDEBAR_PAGE_SIZE,
      }
    : null;

  const chatsQuery = useChats(sidebarInput);
  const allCountQuery = useChats(
    activeWaba
      ? {
          wabaId: activeWaba.id,
          filter: 'all',
          phoneNumberId: resolvedPhoneNumberId,
          q: deferredSearchValue || undefined,
          limit: 1,
        }
      : null,
  );
  const unreadCountQuery = useChats(
    activeWaba
      ? {
          wabaId: activeWaba.id,
          filter: 'unread',
          phoneNumberId: resolvedPhoneNumberId,
          q: deferredSearchValue || undefined,
          limit: 1,
        }
      : null,
  );
  const conversationQuery = useConversation(
    activeWaba && resolvedConversationId
      ? {
          wabaId: activeWaba.id,
          conversationId: resolvedConversationId,
        }
      : null,
  );
  const messagesQuery = useChatMessages(
    activeWaba && resolvedConversationId
      ? {
          wabaId: activeWaba.id,
          conversationId: resolvedConversationId,
          limit: CHAT_MESSAGE_PAGE_SIZE,
        }
      : null,
  );
  const markReadMutation = useMarkConversationRead(sidebarInput);
  const sendMessageMutation = useSendMessage(sidebarInput);
  useChatEvents(
    activeWaba
      ? {
          ...sidebarInput!,
          conversationId: resolvedConversationId,
        }
      : null,
  );

  const conversations =
    chatsQuery.data?.pages.flatMap(
      (page: ChatConversationListResponse) => page.chats,
    ) ?? [];
  const messages =
    [...(messagesQuery.data?.pages ?? [])]
      .reverse()
      .flatMap((page) => page.messages) ?? [];
  const selectedConversation =
    conversationQuery.data ??
    conversations.find(
      (conversation: ChatConversation) =>
        conversation.id === resolvedConversationId,
    );
  const allCount = allCountQuery.data?.pages[0]?.total ?? 0;
  const unreadCount = unreadCountQuery.data?.pages[0]?.total ?? 0;

  const replaceSearchParams = useCallback(
    (nextValues: Record<string, string | null | undefined>) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString());

      Object.entries(nextValues).forEach(([key, value]) => {
        if (value) {
          nextSearchParams.set(key, value);
        } else {
          nextSearchParams.delete(key);
        }
      });

      const nextUrl = nextSearchParams.toString()
        ? `${pathname}?${nextSearchParams.toString()}`
        : pathname;

      startTransition(() => {
        router.replace(nextUrl, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (isLoadingWabas || wabas.length === 0) {
      return;
    }

    const hasValidWaba = wabas.some((waba) => waba.id === resolvedWabaId);

    if (!hasValidWaba) {
      replaceSearchParams({
        wabaId: wabas[0]?.id,
        conversationId: null,
        phoneNumberId: null,
      });
    }
  }, [isLoadingWabas, replaceSearchParams, resolvedWabaId, wabas]);

  useEffect(() => {
    if (!activeWaba || !resolvedPhoneNumberId) {
      return;
    }

    const hasValidPhoneNumber = activeWaba.phoneNumbers.some(
      (phoneNumber) => phoneNumber.id === resolvedPhoneNumberId,
    );

    if (!hasValidPhoneNumber) {
      replaceSearchParams({
        phoneNumberId: null,
      });
    }
  }, [activeWaba, replaceSearchParams, resolvedPhoneNumberId]);

  useEffect(() => {
    if (
      activeWaba &&
      resolvedConversationId &&
      conversationQuery.isError &&
      !conversationQuery.isFetching
    ) {
      replaceSearchParams({
        conversationId: null,
      });
    }
  }, [
    activeWaba,
    conversationQuery.isError,
    conversationQuery.isFetching,
    replaceSearchParams,
    resolvedConversationId,
  ]);

  useEffect(() => {
    if (
      activeWaba &&
      resolvedConversationId &&
      selectedConversation?.unreadCount &&
      !markReadMutation.isPending
    ) {
      markReadMutation.mutate({
        wabaId: activeWaba.id,
        conversationId: resolvedConversationId,
      });
    }
  }, [
    activeWaba,
    markReadMutation,
    resolvedConversationId,
    selectedConversation?.unreadCount,
  ]);

  if (isLoadingWabas) {
    return <ChatWorkspaceLoading />;
  }

  if (wabas.length === 0) {
    return (
      <ChatEmptyState
        title="No WABA connected yet"
        description="Connect at least one WhatsApp Business Account to start managing conversations in the shared inbox."
        icon={InboxIcon}
        className="min-h-[72vh]"
      />
    );
  }

  const showMobileDetail = Boolean(resolvedConversationId);

  return (
    <div className="flex h-full w-full overflow-hidden rounded-[30px] border bg-background">
      <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-background">
        <div className="flex h-[60px] shrink-0 items-center border-b bg-background px-4">
          <WabaSwitcher
            wabas={wabas}
            activeWabaId={activeWaba?.id}
            onSelectWaba={(wabaId) => {
              replaceSearchParams({
                wabaId,
                conversationId: null,
                phoneNumberId: null,
              });
            }}
          />
        </div>

        <div className="relative flex min-h-0 flex-1 overflow-hidden bg-background">
          <div
            className={`absolute inset-0 z-10 flex h-full w-full flex-col overflow-hidden bg-background lg:static lg:w-[380px] lg:shrink-0 lg:border-r ${showMobileDetail ? 'hidden lg:flex' : 'flex'}`}
          >
            <ChatSidebar
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              filter={resolvedFilter}
              onFilterChange={(value) => {
                replaceSearchParams({
                  filter: value,
                  conversationId: null,
                });
              }}
              phoneNumbers={phoneNumbers}
              selectedPhoneNumberId={resolvedPhoneNumberId}
              onPhoneNumberChange={(value) => {
                replaceSearchParams({
                  phoneNumberId: value,
                  conversationId: null,
                });
              }}
              conversations={conversations}
              activeConversationId={resolvedConversationId}
              isLoading={chatsQuery.isLoading}
              isError={chatsQuery.isError}
              errorMessage={
                chatsQuery.error instanceof Error
                  ? chatsQuery.error.message
                  : undefined
              }
              hasNextPage={Boolean(chatsQuery.hasNextPage)}
              isFetchingNextPage={chatsQuery.isFetchingNextPage}
              onLoadMore={() => {
                if (chatsQuery.hasNextPage && !chatsQuery.isFetchingNextPage) {
                  void chatsQuery.fetchNextPage();
                }
              }}
              onRetry={() => {
                void chatsQuery.refetch();
              }}
              onSelectConversation={(conversationId) => {
                replaceSearchParams({
                  conversationId,
                });
              }}
              allCount={allCount}
              unreadCount={unreadCount}
            />
          </div>

          <div
            className={`min-w-0 flex-1 flex-col overflow-hidden ${!showMobileDetail ? 'hidden lg:flex' : 'flex'}`}
          >
            {selectedConversation ? (
              <ChatDetail
                conversation={selectedConversation}
                messages={messages}
                isLoading={
                  conversationQuery.isLoading || messagesQuery.isLoading
                }
                hasNextPage={Boolean(messagesQuery.hasNextPage)}
                isFetchingNextPage={messagesQuery.isFetchingNextPage}
                onLoadOlder={() => {
                  if (
                    messagesQuery.hasNextPage &&
                    !messagesQuery.isFetchingNextPage
                  ) {
                    void messagesQuery.fetchNextPage();
                  }
                }}
                isSending={sendMessageMutation.isPending}
                onSend={async (content) => {
                  if (!activeWaba || !resolvedConversationId) {
                    return;
                  }

                  await sendMessageMutation.mutateAsync({
                    wabaId: activeWaba.id,
                    conversationId: resolvedConversationId,
                    content,
                  });
                }}
                showBackButton={showMobileDetail}
                onBack={() => {
                  replaceSearchParams({
                    conversationId: null,
                  });
                }}
              />
            ) : (
              <div className="flex h-full flex-1 items-center justify-center bg-muted/30">
                <ChatEmptyState
                  title="No chat selected"
                  description="Select a chat from the sidebar to view the conversation."
                  icon={InboxIcon}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
