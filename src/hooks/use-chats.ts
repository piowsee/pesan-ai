'use client';

import {
  CHAT_MESSAGE_PAGE_SIZE,
  CHAT_SIDEBAR_PAGE_SIZE,
  getConversationDisplayName,
} from '@/lib/chat';
import type {
  ChatConversation,
  ChatConversationListResponse,
  ChatMessage,
  ChatMessageListResponse,
  ChatReadReceiptResponse,
  ChatSidebarFilter,
  ChatStreamMessageEvent,
  ChatStreamStatusEvent,
} from '@/types/chat';
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useEffectEvent, useState } from 'react';

export interface ChatWaba {
  id: string;
  wabaId: string;
  businessName?: string | null;
  status: string;
  phoneNumbers: {
    id: string;
    displayPhoneNumber: string;
  }[];
}

type SidebarQueryInput = {
  wabaId: string;
  filter: ChatSidebarFilter;
  phoneNumberId?: string;
  q?: string;
  limit?: number;
};

type ConversationQueryInput = {
  wabaId: string;
  conversationId: string;
};

type MessagesQueryInput = {
  wabaId: string;
  conversationId: string;
  limit?: number;
};

type SendMessageInput = {
  wabaId: string;
  conversationId: string;
  content: string;
};

type SendMessageResponse = {
  conversation: ChatConversation;
  message: ChatMessage;
};

type MarkReadVariables = {
  wabaId: string;
  conversationId: string;
};

type MarkReadContext = {
  previousSidebar?: InfiniteData<ChatConversationListResponse>;
  previousConversation?: ChatConversation;
  sidebarKey?: ReturnType<typeof chatKeys.sidebar>;
  conversationKey?: ReturnType<typeof chatKeys.conversation>;
};

type SendMessageContext = {
  sidebarKey?: ReturnType<typeof chatKeys.sidebar>;
  conversationKey?: ReturnType<typeof chatKeys.conversation>;
  messagesKey?: ReturnType<typeof chatKeys.messages>;
  previousSidebar?: InfiniteData<ChatConversationListResponse>;
  previousConversation?: ChatConversation;
  previousMessages?: InfiniteData<ChatMessageListResponse>;
  optimisticMessage?: ChatMessage;
};

function extractErrorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === 'object' &&
    'message' in payload &&
    typeof payload.message === 'string'
  ) {
    return payload.message;
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    payload.data &&
    typeof payload.data === 'object'
  ) {
    const data = payload.data as Record<string, unknown>;

    if (typeof data.message === 'string') {
      return data.message;
    }

    const firstFieldError = Object.values(data).find(
      (value) => typeof value === 'string',
    );

    if (typeof firstFieldError === 'string') {
      return firstFieldError;
    }
  }

  return fallback;
}

async function fetchJsend<T>(
  input: RequestInfo,
  init: RequestInit,
  fallback: string,
) {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => null)) as {
    status?: string;
    data?: T;
    message?: string;
  } | null;

  if (!response.ok || payload?.status !== 'success') {
    throw new Error(extractErrorMessage(payload, fallback));
  }

  return payload.data as T;
}

async function fetchChatWabas() {
  const data = await fetchJsend<{ wabas: ChatWaba[] }>(
    '/api/waba',
    {
      method: 'GET',
    },
    'Failed to fetch WABAs',
  );

  return data.wabas ?? [];
}

async function fetchChats({
  wabaId,
  page,
  limit,
  q,
  filter,
  phoneNumberId,
}: SidebarQueryInput & { page: number; limit: number }) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    filter,
  });

  if (q) {
    params.set('q', q);
  }

  if (phoneNumberId) {
    params.set('phoneNumberId', phoneNumberId);
  }

  return fetchJsend<ChatConversationListResponse>(
    `/api/waba/${wabaId}/conversation?${params.toString()}`,
    {
      method: 'GET',
    },
    'Failed to fetch chats',
  );
}

async function fetchConversation({
  wabaId,
  conversationId,
}: ConversationQueryInput) {
  const data = await fetchJsend<{ conversation: ChatConversation }>(
    `/api/waba/${wabaId}/conversation/${conversationId}`,
    {
      method: 'GET',
    },
    'Failed to fetch conversation',
  );

  return data.conversation;
}

async function fetchMessages({
  wabaId,
  conversationId,
  before,
  limit,
}: MessagesQueryInput & { before?: string; limit: number }) {
  const params = new URLSearchParams({
    limit: String(limit),
  });

  if (before) {
    params.set('before', before);
  }

  return fetchJsend<ChatMessageListResponse>(
    `/api/waba/${wabaId}/conversation/${conversationId}/message?${params.toString()}`,
    {
      method: 'GET',
    },
    'Failed to fetch messages',
  );
}

async function sendMessage({
  wabaId,
  conversationId,
  content,
}: SendMessageInput) {
  return fetchJsend<SendMessageResponse>(
    `/api/waba/${wabaId}/conversation/${conversationId}/message`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: content,
      }),
    },
    'Failed to send message',
  );
}

async function markConversationRead({
  wabaId,
  conversationId,
}: {
  wabaId: string;
  conversationId: string;
}) {
  return fetchJsend<ChatReadReceiptResponse>(
    `/api/waba/${wabaId}/conversation/${conversationId}/read`,
    {
      method: 'PATCH',
    },
    'Failed to mark chat as read',
  );
}

function matchMessage(target: ChatMessage, incoming: ChatMessage) {
  if (target.id === incoming.id) {
    return true;
  }

  if (target.messageId && incoming.messageId) {
    return target.messageId === incoming.messageId;
  }

  return false;
}

function dedupeMessages(messages: ChatMessage[]) {
  const seen = new Set<string>();

  return messages.filter((message) => {
    const key = message.messageId
      ? `messageId:${message.messageId}`
      : `id:${message.id}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function upsertConversationInPages(
  data: InfiniteData<ChatConversationListResponse> | undefined,
  conversation: ChatConversation,
) {
  if (!data) {
    return {
      pages: [
        {
          chats: [conversation],
          page: 1,
          limit: CHAT_SIDEBAR_PAGE_SIZE,
          total: 1,
          hasNextPage: false,
        },
      ],
      pageParams: [1],
    } satisfies InfiniteData<ChatConversationListResponse>;
  }

  let exists = false;

  const pages = data.pages.map(
    (page: ChatConversationListResponse, pageIndex: number) => {
      const chatsWithoutConversation = page.chats.filter(
        (chat: ChatConversation) => {
          const isMatch = chat.id === conversation.id;
          exists = exists || isMatch;
          return !isMatch;
        },
      );

      if (pageIndex === 0) {
        return {
          ...page,
          chats: [conversation, ...chatsWithoutConversation],
        };
      }

      return {
        ...page,
        chats: chatsWithoutConversation,
      };
    },
  );

  const total = exists
    ? (data.pages[0]?.total ?? 0)
    : (data.pages[0]?.total ?? 0) + 1;

  return {
    ...data,
    pages: pages.map((page: ChatConversationListResponse) => ({
      ...page,
      total,
      hasNextPage: page.page * page.limit < total,
    })),
  };
}

function patchConversationInPages(
  data: InfiniteData<ChatConversationListResponse> | undefined,
  conversationId: string,
  updater: (conversation: ChatConversation) => ChatConversation,
) {
  if (!data) {
    return data;
  }

  return {
    ...data,
    pages: data.pages.map((page: ChatConversationListResponse) => ({
      ...page,
      chats: page.chats.map((chat: ChatConversation) =>
        chat.id === conversationId ? updater(chat) : chat,
      ),
    })),
  };
}

function upsertMessageInPages(
  data: InfiniteData<ChatMessageListResponse> | undefined,
  message: ChatMessage,
) {
  if (!data) {
    return {
      pages: [
        {
          messages: [message],
          nextBefore: null,
          limit: CHAT_MESSAGE_PAGE_SIZE,
        },
      ],
      pageParams: [undefined],
    } satisfies InfiniteData<ChatMessageListResponse>;
  }

  let replaced = false;

  const pages = data.pages.map((page: ChatMessageListResponse) => {
    const hasMessage = page.messages.some((currentMessage: ChatMessage) =>
      matchMessage(currentMessage, message),
    );

    if (hasMessage) {
      replaced = true;
      return {
        ...page,
        messages: dedupeMessages(
          page.messages.map((currentMessage: ChatMessage) =>
            matchMessage(currentMessage, message) ? message : currentMessage,
          ),
        ),
      };
    }

    return page;
  });

  if (replaced) {
    return {
      ...data,
      pages,
    };
  }

  if (pages.length === 0) {
    return {
      ...data,
      pages: [
        {
          messages: [message],
          nextBefore: null,
          limit: CHAT_MESSAGE_PAGE_SIZE,
        },
      ],
    };
  }

  return {
    ...data,
    pages: pages.map((page: ChatMessageListResponse, pageIndex: number) =>
      pageIndex === 0
        ? {
            ...page,
            messages: dedupeMessages([...page.messages, message]),
          }
        : page,
    ),
  };
}

function replaceOptimisticMessageInPages(
  data: InfiniteData<ChatMessageListResponse> | undefined,
  optimisticMessageId: string,
  message: ChatMessage,
) {
  if (!data) {
    return upsertMessageInPages(data, message);
  }

  let replaced = false;

  const pages = data.pages.map((page: ChatMessageListResponse) => ({
    ...page,
    messages: dedupeMessages(
      page.messages.map((currentMessage: ChatMessage) => {
        if (
          currentMessage.id === optimisticMessageId ||
          matchMessage(currentMessage, message)
        ) {
          replaced = true;
          return message;
        }

        return currentMessage;
      }),
    ),
  }));

  if (replaced) {
    return {
      ...data,
      pages,
    };
  }

  return upsertMessageInPages(data, message);
}

function buildOptimisticConversation(
  currentConversation: ChatConversation | undefined,
  message: ChatMessage,
) {
  if (!currentConversation) {
    return undefined;
  }

  return {
    ...currentConversation,
    displayName: getConversationDisplayName(
      currentConversation.customerName,
      currentConversation.customerPhone,
    ),
    lastMessageAt: message.timestamp,
    lastMessage: message,
  };
}

export const chatKeys = {
  all: ['chat'] as const,
  wabas: () => [...chatKeys.all, 'wabas'] as const,
  sidebar: (input: SidebarQueryInput) =>
    [...chatKeys.all, 'sidebar', input] as const,
  conversation: (input: ConversationQueryInput) =>
    [...chatKeys.all, 'conversation', input] as const,
  messages: (input: MessagesQueryInput) =>
    [...chatKeys.all, 'messages', input] as const,
  unreadTotals: () => [...chatKeys.all, 'unreadTotals'] as const,
};

export function useChatWabas() {
  return useQuery({
    queryKey: chatKeys.wabas(),
    queryFn: fetchChatWabas,
    staleTime: 5 * 60 * 1000,
  });
}

export function useChats(input: SidebarQueryInput | null) {
  return useInfiniteQuery({
    queryKey: input
      ? chatKeys.sidebar({
          wabaId: input.wabaId,
          filter: input.filter,
          phoneNumberId: input.phoneNumberId,
          q: input.q,
          limit: input.limit ?? CHAT_SIDEBAR_PAGE_SIZE,
        })
      : [...chatKeys.all, 'sidebar', 'disabled'],
    queryFn: ({ pageParam = 1 }: { pageParam: number }) =>
      fetchChats({
        ...(input as SidebarQueryInput),
        page: pageParam,
        limit: input?.limit ?? CHAT_SIDEBAR_PAGE_SIZE,
      }),
    enabled: Boolean(input?.wabaId),
    initialPageParam: 1,
    getNextPageParam: (lastPage: ChatConversationListResponse) =>
      lastPage.hasNextPage ? lastPage.page + 1 : undefined,
    staleTime: 30 * 1000,
  });
}

export function useConversation(input: ConversationQueryInput | null) {
  return useQuery({
    queryKey: input
      ? chatKeys.conversation(input)
      : [...chatKeys.all, 'conversation', 'disabled'],
    queryFn: () => fetchConversation(input as ConversationQueryInput),
    enabled: Boolean(input?.wabaId && input?.conversationId),
    staleTime: 30 * 1000,
  });
}

export function useChatMessages(input: MessagesQueryInput | null) {
  return useInfiniteQuery({
    queryKey: input
      ? chatKeys.messages({
          wabaId: input.wabaId,
          conversationId: input.conversationId,
          limit: input.limit ?? CHAT_MESSAGE_PAGE_SIZE,
        })
      : [...chatKeys.all, 'messages', 'disabled'],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      fetchMessages({
        ...(input as MessagesQueryInput),
        limit: input?.limit ?? CHAT_MESSAGE_PAGE_SIZE,
        before: typeof pageParam === 'string' ? pageParam : undefined,
      }),
    enabled: Boolean(input?.wabaId && input?.conversationId),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: ChatMessageListResponse) =>
      lastPage.nextBefore ?? undefined,
    staleTime: 15 * 1000,
  });
}

export function useMarkConversationRead(input: SidebarQueryInput | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markConversationRead,
    onMutate: async ({ wabaId, conversationId }: MarkReadVariables) => {
      if (!input) {
        return {};
      }

      const sidebarKey = chatKeys.sidebar({
        wabaId,
        filter: input.filter,
        phoneNumberId: input.phoneNumberId,
        q: input.q,
        limit: input.limit ?? CHAT_SIDEBAR_PAGE_SIZE,
      });
      const conversationKey = chatKeys.conversation({
        wabaId,
        conversationId,
      });

      await Promise.all([
        queryClient.cancelQueries({ queryKey: sidebarKey }),
        queryClient.cancelQueries({ queryKey: conversationKey }),
      ]);

      const previousSidebar =
        queryClient.getQueryData<InfiniteData<ChatConversationListResponse>>(
          sidebarKey,
        );
      const previousConversation =
        queryClient.getQueryData<ChatConversation>(conversationKey);

      queryClient.setQueryData(
        sidebarKey,
        (oldData: InfiniteData<ChatConversationListResponse> | undefined) =>
          patchConversationInPages(oldData, conversationId, (conversation) => ({
            ...conversation,
            unreadCount: 0,
          })),
      );
      queryClient.setQueryData(
        conversationKey,
        (oldData: ChatConversation | undefined) =>
          oldData
            ? {
                ...oldData,
                unreadCount: 0,
              }
            : oldData,
      );

      return {
        previousSidebar,
        previousConversation,
        sidebarKey,
        conversationKey,
      };
    },
    onError: (
      _error: unknown,
      _variables: MarkReadVariables,
      context: MarkReadContext | undefined,
    ) => {
      if (context?.sidebarKey && context.previousSidebar !== undefined) {
        queryClient.setQueryData(context.sidebarKey, context.previousSidebar);
      }

      if (
        context?.conversationKey &&
        context.previousConversation !== undefined
      ) {
        queryClient.setQueryData(
          context.conversationKey,
          context.previousConversation,
        );
      }
    },
    onSuccess: (
      result: ChatReadReceiptResponse,
      variables: MarkReadVariables,
      context: MarkReadContext | undefined,
    ) => {
      if (!context?.sidebarKey || !context?.conversationKey) {
        return;
      }

      queryClient.setQueryData(
        context.sidebarKey,
        (oldData: InfiniteData<ChatConversationListResponse> | undefined) =>
          patchConversationInPages(
            oldData,
            variables.conversationId,
            (conversation) => ({
              ...conversation,
              unreadCount: result.unreadCount,
            }),
          ),
      );
      queryClient.setQueryData(
        context.conversationKey,
        (oldData: ChatConversation | undefined) =>
          oldData
            ? {
                ...oldData,
                unreadCount: result.unreadCount,
              }
            : oldData,
      );
    },
  });
}

export function useSendMessage(input: SidebarQueryInput | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendMessage,
    onMutate: async ({ wabaId, conversationId, content }: SendMessageInput) => {
      if (!input) {
        return {};
      }

      const sidebarKey = chatKeys.sidebar({
        wabaId,
        filter: input.filter,
        phoneNumberId: input.phoneNumberId,
        q: input.q,
        limit: input.limit ?? CHAT_SIDEBAR_PAGE_SIZE,
      });
      const conversationKey = chatKeys.conversation({
        wabaId,
        conversationId,
      });
      const messagesKey = chatKeys.messages({
        wabaId,
        conversationId,
        limit: CHAT_MESSAGE_PAGE_SIZE,
      });

      await Promise.all([
        queryClient.cancelQueries({ queryKey: sidebarKey }),
        queryClient.cancelQueries({ queryKey: conversationKey }),
        queryClient.cancelQueries({ queryKey: messagesKey }),
      ]);

      const previousSidebar =
        queryClient.getQueryData<InfiniteData<ChatConversationListResponse>>(
          sidebarKey,
        );
      const previousConversation =
        queryClient.getQueryData<ChatConversation>(conversationKey);
      const previousMessages =
        queryClient.getQueryData<InfiniteData<ChatMessageListResponse>>(
          messagesKey,
        );

      const optimisticMessage: ChatMessage = {
        id: `temp-${crypto.randomUUID()}`,
        messageId: null,
        conversationId,
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

      const optimisticConversation = buildOptimisticConversation(
        previousConversation,
        optimisticMessage,
      );

      queryClient.setQueryData(
        messagesKey,
        (oldData: InfiniteData<ChatMessageListResponse> | undefined) =>
          upsertMessageInPages(oldData, optimisticMessage),
      );
      queryClient.setQueryData(conversationKey, optimisticConversation);
      if (optimisticConversation) {
        queryClient.setQueryData(
          sidebarKey,
          (oldData: InfiniteData<ChatConversationListResponse> | undefined) =>
            upsertConversationInPages(oldData, optimisticConversation),
        );
      }

      return {
        sidebarKey,
        conversationKey,
        messagesKey,
        previousSidebar,
        previousConversation,
        previousMessages,
        optimisticMessage,
      };
    },
    onError: (
      _error: unknown,
      _variables: SendMessageInput,
      context: SendMessageContext | undefined,
    ) => {
      if (!context) {
        return;
      }

      if (context.sidebarKey && context.previousSidebar !== undefined)
        queryClient.setQueryData(context.sidebarKey, context.previousSidebar);
      if (context.conversationKey && context.previousConversation !== undefined)
        queryClient.setQueryData(
          context.conversationKey,
          context.previousConversation,
        );
      if (context.messagesKey && context.previousMessages !== undefined)
        queryClient.setQueryData(context.messagesKey, context.previousMessages);
    },
    onSuccess: (
      result: SendMessageResponse,
      variables: SendMessageInput,
      context: SendMessageContext | undefined,
    ) => {
      if (!context) {
        return;
      }

      if (context.conversationKey)
        queryClient.setQueryData(context.conversationKey, result.conversation);
      if (context.messagesKey)
        queryClient.setQueryData(
          context.messagesKey,
          (oldData: InfiniteData<ChatMessageListResponse> | undefined) =>
            replaceOptimisticMessageInPages(
              oldData,
              context.optimisticMessage?.id ?? '',
              result.message,
            ),
        );
      if (context.sidebarKey)
        queryClient.setQueryData(
          context.sidebarKey,
          (oldData: InfiniteData<ChatConversationListResponse> | undefined) =>
            upsertConversationInPages(oldData, result.conversation),
        );
      queryClient.invalidateQueries({
        queryKey: chatKeys.messages({
          wabaId: variables.wabaId,
          conversationId: variables.conversationId,
          limit: CHAT_MESSAGE_PAGE_SIZE,
        }),
      });
    },
  });
}

export function useChatEvents(
  input:
    | (SidebarQueryInput & {
        conversationId?: string;
      })
    | null,
) {
  const queryClient = useQueryClient();
  const activeWabaId = input?.wabaId;
  const [connectionState, setConnectionState] = useState<
    'closed' | 'connecting' | 'open'
  >('connecting');
  const [openWabaId, setOpenWabaId] = useState<string | null>(null);

  const handleIncomingMessage = useEffectEvent(
    (event: ChatStreamMessageEvent) => {
      if (!input) {
        return;
      }

      const sidebarKey = chatKeys.sidebar({
        wabaId: input.wabaId,
        filter: input.filter,
        phoneNumberId: input.phoneNumberId,
        q: input.q,
        limit: input.limit ?? CHAT_SIDEBAR_PAGE_SIZE,
      });

      queryClient.setQueryData(
        sidebarKey,
        (oldData: InfiniteData<ChatConversationListResponse> | undefined) =>
          upsertConversationInPages(oldData, event.conversation),
      );
      queryClient.setQueryData(
        chatKeys.conversation({
          wabaId: input.wabaId,
          conversationId: event.conversation.id,
        }),
        event.conversation,
      );

      if (input.conversationId === event.conversation.id) {
        queryClient.setQueryData(
          chatKeys.messages({
            wabaId: input.wabaId,
            conversationId: event.conversation.id,
            limit: CHAT_MESSAGE_PAGE_SIZE,
          }),
          (oldData: InfiniteData<ChatMessageListResponse> | undefined) =>
            upsertMessageInPages(oldData, event.message),
        );
      }
    },
  );

  const handleStatusUpdate = useEffectEvent((event: ChatStreamStatusEvent) => {
    if (!input) {
      return;
    }

    queryClient.setQueryData(
      chatKeys.messages({
        wabaId: input.wabaId,
        conversationId: event.conversationId,
        limit: CHAT_MESSAGE_PAGE_SIZE,
      }),
      (oldData: InfiniteData<ChatMessageListResponse> | undefined) =>
        upsertMessageInPages(oldData, event.message),
    );
  });

  useEffect(() => {
    if (!activeWabaId) {
      return;
    }

    const eventSource = new EventSource(
      `/api/waba/${activeWabaId}/conversation/stream`,
    );

    const onConnected = () => {
      setOpenWabaId(activeWabaId);
      setConnectionState('open');
    };

    const onMessage = (event: MessageEvent<string>) => {
      handleIncomingMessage(JSON.parse(event.data) as ChatStreamMessageEvent);
    };

    const onStatus = (event: MessageEvent<string>) => {
      handleStatusUpdate(JSON.parse(event.data) as ChatStreamStatusEvent);
    };

    const onError = () => {
      setOpenWabaId(null);
      setConnectionState('connecting');
    };

    eventSource.addEventListener('connected', onConnected);
    eventSource.addEventListener('message', onMessage as EventListener);
    eventSource.addEventListener('status', onStatus as EventListener);
    eventSource.onerror = onError;

    return () => {
      eventSource.removeEventListener('connected', onConnected);
      eventSource.removeEventListener('message', onMessage as EventListener);
      eventSource.removeEventListener('status', onStatus as EventListener);
      eventSource.close();
    };
  }, [activeWabaId]);

  const effectiveConnectionState: 'closed' | 'connecting' | 'open' =
    !activeWabaId
      ? 'closed'
      : connectionState === 'open' && openWabaId === activeWabaId
        ? 'open'
        : 'connecting';

  return {
    connectionState: effectiveConnectionState,
  };
}
