'use client';

import { ChatDetail } from '@/components/chat/chat-detail';
import { ChatEmptyState } from '@/components/chat/chat-empty-state';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ContactInfoPanel } from '@/components/chat/contact-info-panel';
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
  const [isContactInfoOpen, setIsContactInfoOpen] = useState(false);
  const [prevConversationId, setPrevConversationId] = useState<
    string | undefined
  >(undefined);
  const [contactDetailsByConversation, setContactDetailsByConversation] =
    useState<Record<string, { label: string; notes: string }>>({});
  const deferredSearchValue = useDeferredValue(searchValue.trim());

  const resolvedWabaId =
    searchParams.get('wabaId') ?? initialSearchParams.wabaId ?? undefined;
  const resolvedConversationId =
    searchParams.get('conversationId') ??
    initialSearchParams.conversationId ??
    undefined;

  if (resolvedConversationId !== prevConversationId) {
    setPrevConversationId(resolvedConversationId);
    setIsContactInfoOpen(false);
  }
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
  const selectedContactDraft = selectedConversation
    ? (contactDetailsByConversation[selectedConversation.id] ?? {
        label: '',
        notes: '',
      })
    : { label: '', notes: '' };

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

  // State reset handled in render phase

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
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-background">
      <div className="shrink-0 bg-background z-10 relative border-b border-brand/15">
        <div className="flex h-15 items-center px-4">
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
            onSearchChange={setSearchValue}
            filter={resolvedFilter}
            onFilterChange={(value) => {
              replaceSearchParams({
                filter: value,
              });
            }}
            phoneNumbers={phoneNumbers}
            selectedPhoneNumberId={resolvedPhoneNumberId}
            onPhoneNumberChange={(value) => {
              replaceSearchParams({
                phoneNumberId: value,
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
          className={`absolute inset-0 z-20 flex min-w-0 flex-1 flex-col bg-background transition-transform duration-200 ease-out lg:static lg:z-0 lg:translate-x-0 ${!showMobileDetail ? 'translate-x-full pointer-events-none' : isContactInfoOpen ? '-translate-x-full pointer-events-none lg:pointer-events-auto' : 'translate-x-0'}`}
        >
          {selectedConversation ? (
            <ChatDetail
              conversation={selectedConversation}
              messages={messages}
              isLoading={conversationQuery.isLoading || messagesQuery.isLoading}
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
              onContactAreaClick={() => {
                setIsContactInfoOpen((previous) => !previous);
              }}
            />
          ) : (
            <div className="flex h-full flex-1 items-center justify-center bg-brand/5">
              <ChatEmptyState
                title="No chat selected"
                description="Select a chat from the sidebar to view the conversation."
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
                setContactDetailsByConversation((previous) => ({
                  ...previous,
                  [selectedConversation.id]: {
                    ...selectedContactDraft,
                    label: value,
                  },
                }));
              }}
              onNotesChange={(value) => {
                setContactDetailsByConversation((previous) => ({
                  ...previous,
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
