import { extractJSendErrorMessage } from '@/lib/api-helper/error';
import type { ChatConversation, ChatMessage } from '@/types/chat';
import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  type RawConversation,
  conversationKeys,
  mapRawConversationToChatConversation,
} from './use-conversations';

export const messageKeys = {
  root: ['messages'] as const,
  all: (convId: string) => ['messages', convId] as const,
  mediaDownloadUrl: (wabaId: string, convId: string, key: string) =>
    ['messages', convId, 'media-download-url', wabaId, key] as const,
};

const MEDIA_DOWNLOAD_URL_EXPIRES_IN_FALLBACK_MS = 30 * 60 * 1000;
const MEDIA_DOWNLOAD_URL_REFRESH_BUFFER_MS = 60 * 1000;
const MEDIA_DOWNLOAD_URL_MIN_STALE_TIME_MS = 10 * 1000;

function getMediaDownloadUrlStaleTime(expiresIn?: number) {
  const expiresInMs = expiresIn
    ? expiresIn * 1000
    : MEDIA_DOWNLOAD_URL_EXPIRES_IN_FALLBACK_MS;

  return Math.max(
    MEDIA_DOWNLOAD_URL_MIN_STALE_TIME_MS,
    expiresInMs - MEDIA_DOWNLOAD_URL_REFRESH_BUFFER_MS,
  );
}

// ─── Types ───────────────────────────────────────────────────────────

export interface MessageGroup {
  date: string; // YYYY-MM-DD
  messages: ChatMessage[];
}

interface MessagePageCache {
  messages: ChatMessage[];
  total: number;
  page: number;
  limit: number;
}

interface MediaDownloadUrlResponse {
  downloadUrl: string;
  expiresIn: number;
}

interface MediaDownloadUrlParams {
  wabaId: string;
  convId: string;
  key: string;
}

interface MediaUploadUrlResponse {
  key: string;
  url: string;
  method: 'POST';
  fields: Record<string, string>;
  maxSizeBytes: number;
  expiresIn: number;
}

interface SendMediaMessageData {
  wabaId: string;
  convId: string;
  file: File;
  caption?: string;
}

type ChatMediaType = 'audio' | 'document' | 'image' | 'video';

// ─── API Functions ───────────────────────────────────────────────────

async function fetchMessages(
  wabaId: string,
  convId: string,
  page: number,
  limit = 50,
): Promise<MessagePageCache> {
  const response = await fetch(
    `/api/waba/${wabaId}/conversation/${convId}/message?page=${page}&limit=${limit}`,
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.data?.message ?? 'Failed to fetch messages';
    throw new Error(message);
  }

  const json = await response.json();
  return json.data;
}

async function fetchMediaDownloadUrl({
  wabaId,
  convId,
  key,
}: MediaDownloadUrlParams): Promise<MediaDownloadUrlResponse> {
  const searchParams = new URLSearchParams({ wabaId, convId, key });
  const response = await fetch(`/api/media/download/url?${searchParams}`);

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      extractJSendErrorMessage(body) ?? 'Failed to load media preview',
    );
  }

  const json = await response.json();
  return json.data;
}

async function fetchMediaUploadUrl({
  wabaId,
  convId,
  contentType,
}: {
  wabaId: string;
  convId: string;
  contentType: string;
}): Promise<MediaUploadUrlResponse> {
  const searchParams = new URLSearchParams({ wabaId, convId, contentType });
  const response = await fetch(`/api/media/upload/url?${searchParams}`);

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      extractJSendErrorMessage(body) ?? 'Failed to prepare media upload',
    );
  }

  const json = await response.json();
  return json.data;
}

async function uploadFileToObjectStorage({
  file,
  uploadUrl,
}: {
  file: File;
  uploadUrl: MediaUploadUrlResponse;
}) {
  if (file.size > uploadUrl.maxSizeBytes) {
    throw new Error('Selected file is larger than the allowed upload size');
  }

  const formData = new FormData();

  Object.entries(uploadUrl.fields).forEach(([key, value]) => {
    formData.append(key, value);
  });
  formData.append('file', file);

  const response = await fetch(uploadUrl.url, {
    method: uploadUrl.method,
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload media file');
  }
}

async function confirmUploadedMediaMessage({
  caption,
  convId,
  file,
  key,
  wabaId,
}: SendMediaMessageData & { key: string }) {
  const response = await fetch('/api/media/upload/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      wabaId,
      convId,
      key,
      caption,
      filename: file.name,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      extractJSendErrorMessage(body) ?? 'Failed to confirm media upload',
    );
  }

  const json = await response.json();
  return json.data as {
    message: ChatMessage;
    conversation: RawConversation;
  };
}

async function uploadAndConfirmMediaMessage(data: SendMediaMessageData) {
  const uploadUrl = await fetchMediaUploadUrl({
    wabaId: data.wabaId,
    convId: data.convId,
    contentType: data.file.type,
  });

  await uploadFileToObjectStorage({ file: data.file, uploadUrl });

  return confirmUploadedMediaMessage({ ...data, key: uploadUrl.key });
}

// ─── Grouping Helper ───────────────────────────────────────────────

function getMediaTypeFromFile(file: File): ChatMediaType {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('video/')) return 'video';

  return 'document';
}

function getCachedMessages({
  convId,
  queryClient,
}: {
  convId: string;
  queryClient: QueryClient;
}) {
  return (
    queryClient
      .getQueryData<InfiniteData<MessagePageCache>>(messageKeys.all(convId))
      ?.pages.flatMap((page) => page.messages) ?? []
  );
}

function getOptimisticTimelineTimestamp({
  convId,
  queryClient,
}: {
  convId: string;
  queryClient: QueryClient;
}) {
  const latestMessageTime = getCachedMessages({ convId, queryClient }).reduce(
    (latestTime, message) => {
      const messageTime = new Date(message.timestamp).getTime();
      return Number.isFinite(messageTime)
        ? Math.max(latestTime, messageTime)
        : latestTime;
    },
    0,
  );

  if (latestMessageTime > 0) {
    return new Date(latestMessageTime + 1).toISOString();
  }

  return new Date().toISOString();
}

function updateConversationListCache({
  createChat,
  queryClient,
  updateChat,
  wabaId,
}: {
  createChat: () => ChatConversation;
  queryClient: QueryClient;
  updateChat: (chat: ChatConversation) => ChatConversation;
  wabaId: string;
}) {
  queryClient.setQueryData<{ chats: ChatConversation[]; total: number }>(
    conversationKeys.all(wabaId),
    (old) => {
      if (!old) return old;

      let found = false;
      const updatedChats = old.chats.map((chat) => {
        const updatedChat = updateChat(chat);
        found = found || updatedChat !== chat;
        return updatedChat;
      });

      if (!found) {
        return {
          ...old,
          chats: [createChat(), ...old.chats],
          total: old.total + 1,
        };
      }

      const sortedChats = [...updatedChats].sort((a, b) => {
        const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return timeB - timeA;
      });

      return { ...old, chats: sortedChats };
    },
  );
}

function updateConversationCacheWithMessage({
  conversation,
  convId,
  message,
  queryClient,
  wabaId,
}: {
  conversation: RawConversation;
  convId: string;
  message: ChatMessage;
  queryClient: QueryClient;
  wabaId: string;
}) {
  updateConversationListCache({
    createChat: () =>
      mapRawConversationToChatConversation({
        ...conversation,
        messages: [message],
      }),
    queryClient,
    updateChat: (chat) =>
      chat.id === convId
        ? {
            ...chat,
            lastMessage: message,
            lastMessageAt: message.timestamp,
            updatedAt: new Date().toISOString(),
          }
        : chat,
    wabaId,
  });
}

function upsertMessageInFirstPage({
  convId,
  message,
  queryClient,
}: {
  convId: string;
  message: ChatMessage;
  queryClient: QueryClient;
}) {
  queryClient.setQueryData<InfiniteData<MessagePageCache>>(
    messageKeys.all(convId),
    (old) => {
      if (!old) return old;

      return {
        ...old,
        pages: old.pages.map((page, index) => {
          if (index !== 0) return page;

          const existingMessage = page.messages.some(
            (cachedMessage) => cachedMessage.id === message.id,
          );

          if (existingMessage) {
            return {
              ...page,
              messages: page.messages.map((cachedMessage) =>
                cachedMessage.id === message.id ? message : cachedMessage,
              ),
            };
          }

          return {
            ...page,
            messages: [message, ...page.messages],
            total: page.total + 1,
          };
        }),
      };
    },
  );
}

function insertOptimisticMessage({
  convId,
  message,
  queryClient,
}: {
  convId: string;
  message: ChatMessage;
  queryClient: QueryClient;
}) {
  upsertMessageInFirstPage({ convId, message, queryClient });
}

function markOptimisticMessageAsFailed({
  convId,
  errorMessage,
  optimisticId,
  queryClient,
}: {
  convId: string;
  errorMessage: string;
  optimisticId?: string;
  queryClient: QueryClient;
}) {
  if (!optimisticId) {
    return;
  }

  queryClient.setQueryData<InfiniteData<MessagePageCache>>(
    messageKeys.all(convId),
    (old) => {
      if (!old) return old;

      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          messages: page.messages.map((message) =>
            message.id === optimisticId
              ? { ...message, status: 'failed', errorMessage }
              : message,
          ),
        })),
      };
    },
  );
}

function replaceOptimisticMessageWithConfirmedMessage({
  confirmedMessage,
  convId,
  optimisticId,
  queryClient,
}: {
  confirmedMessage: ChatMessage;
  convId: string;
  optimisticId?: string;
  queryClient: QueryClient;
}) {
  queryClient.setQueryData<InfiniteData<MessagePageCache>>(
    messageKeys.all(convId),
    (old) => {
      if (!old) return old;

      return {
        ...old,
        pages: old.pages.map((page, index) => {
          if (index !== 0) return page;

          const removedOptimisticMessage = optimisticId
            ? page.messages.some((message) => message.id === optimisticId)
            : false;
          const filteredMessages = optimisticId
            ? page.messages.filter((message) => message.id !== optimisticId)
            : page.messages;
          const alreadyHasConfirmedMessage = filteredMessages.some(
            (message) => message.id === confirmedMessage.id,
          );

          if (alreadyHasConfirmedMessage) {
            return {
              ...page,
              messages: filteredMessages,
              total: removedOptimisticMessage ? page.total - 1 : page.total,
            };
          }

          return {
            ...page,
            messages: [confirmedMessage, ...filteredMessages],
          };
        }),
      };
    },
  );
}

function updateCachesWithConfirmedMessage({
  conversation,
  convId,
  message,
  optimisticId,
  queryClient,
  wabaId,
}: {
  conversation: RawConversation;
  convId: string;
  message: ChatMessage;
  optimisticId?: string;
  queryClient: QueryClient;
  wabaId: string;
}) {
  replaceOptimisticMessageWithConfirmedMessage({
    confirmedMessage: message,
    convId,
    optimisticId,
    queryClient,
  });
  updateConversationCacheWithMessage({
    conversation,
    convId,
    message,
    queryClient,
    wabaId,
  });
}

export function groupMessagesByDate(messages: ChatMessage[]): MessageGroup[] {
  if (!messages.length) return [];

  const groups: MessageGroup[] = [];
  const map: Record<string, ChatMessage[]> = {};

  // Note: messages from API are DESC (newest first).
  // We should sort them ASC (oldest first) before grouping for a timeline.
  // When timestamps tie, we fall back to createdAt and then reverse the
  // original DESC index so the visual order remains chronological.
  const sorted = messages
    .map((message, index) => ({ message, index }))
    .sort((a, b) => {
      const timestampDiff =
        new Date(a.message.timestamp).getTime() -
        new Date(b.message.timestamp).getTime();
      if (timestampDiff !== 0) {
        return timestampDiff;
      }

      const createdAtDiff =
        new Date(a.message.createdAt).getTime() -
        new Date(b.message.createdAt).getTime();
      if (createdAtDiff !== 0) {
        return createdAtDiff;
      }

      return b.index - a.index;
    })
    .map(({ message }) => message);

  sorted.forEach((msg) => {
    const date = new Date(msg.timestamp).toISOString().split('T')[0];
    if (!map[date]) {
      map[date] = [];
      groups.push({ date, messages: map[date] });
    }
    map[date].push(msg);
  });

  return groups;
}

// ─── Hook ────────────────────────────────────────────────────────────

/**
 * useMessages
 * Hook to fetch paginated chat messages for a specific conversation.
 * Supports infinite scroll (scroll up = load older).
 */
export function useMessages(
  wabaId: string | undefined,
  convId: string | undefined,
) {
  return useInfiniteQuery({
    queryKey: messageKeys.all(convId || ''),
    queryFn: ({ pageParam = 1 }) =>
      fetchMessages(wabaId!, convId!, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, total, limit } = lastPage;
      return page * limit < total ? page + 1 : undefined;
    },
    select: (data) => {
      // Flatten all pages into one array
      // Pages are in order [Page 1 (newest), Page 2, Page 3 (oldest)]
      const allMessages = data.pages.flatMap((page) => page.messages);

      // Group them by date
      return groupMessagesByDate(allMessages);
    },
    enabled: !!wabaId && !!convId,
    // Keep data fresh, let real-time updates (SSE) handle new messages
    staleTime: Infinity,
  });
}

export function useMessageMediaDownloadUrl({
  wabaId,
  convId,
  key,
  enabled = true,
}: {
  wabaId?: string;
  convId?: string;
  key?: string | null;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: messageKeys.mediaDownloadUrl(
      wabaId ?? '',
      convId ?? '',
      key ?? '',
    ),
    queryFn: () =>
      fetchMediaDownloadUrl({
        wabaId: wabaId!,
        convId: convId!,
        key: key!,
      }),
    enabled: enabled && Boolean(wabaId && convId && key),
    staleTime: (query) => {
      const data = query.state.data as MediaDownloadUrlResponse | undefined;
      return getMediaDownloadUrlStaleTime(data?.expiresIn);
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

// ─── Mutation Hook ──────────────────────────────────────────────────

interface SendMessageData {
  wabaId: string;
  convId: string;
  content: string;
}

/**
 * useSendMessage
 * Hook to send a text message to a WhatsApp customer within a conversation.
 * Manually updates the messages and conversations cache upon success for instant UI feedback.
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ wabaId, convId, content }: SendMessageData) => {
      const response = await fetch(
        `/api/waba/${wabaId}/conversation/${convId}/message`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: content }),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message = body?.data?.message ?? 'Failed to send message';
        throw new Error(message);
      }

      const json = await response.json();
      return json.data as {
        message: ChatMessage;
        conversation: RawConversation;
      };
    },
    onMutate: async ({ convId, content }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: messageKeys.all(convId) });

      const optimisticId = `optimistic-${Date.now()}`;
      const timelineTimestamp = getOptimisticTimelineTimestamp({
        convId,
        queryClient,
      });
      const optimisticMessage: ChatMessage = {
        id: optimisticId,
        messageId: null,
        conversationId: convId,
        direction: 'outgoing',
        source: 'admin',
        type: 'text',
        content,
        mediaObjectKey: null,
        mediaMimeType: null,
        mediaFilename: null,
        mediaSize: null,
        status: 'sending',
        errorMessage: null,
        localMediaUrl: null,
        timestamp: timelineTimestamp,
        createdAt: timelineTimestamp,
      };

      insertOptimisticMessage({
        convId,
        message: optimisticMessage,
        queryClient,
      });

      return { optimisticId };
    },
    onError: (err, { convId }, context) => {
      // Show error toast
      toast.error(err.message || 'Failed to send message');

      markOptimisticMessageAsFailed({
        convId,
        errorMessage: err.message,
        optimisticId: context?.optimisticId,
        queryClient,
      });
    },
    onSuccess: ({ message, conversation }, { wabaId, convId }, context) => {
      updateCachesWithConfirmedMessage({
        conversation,
        convId,
        message,
        optimisticId: context?.optimisticId,
        queryClient,
        wabaId,
      });
    },
  });
}

export function useSendMediaMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadAndConfirmMediaMessage,
    onMutate: async ({ caption, convId, file }) => {
      await queryClient.cancelQueries({ queryKey: messageKeys.all(convId) });

      const optimisticId = `optimistic-media-${Date.now()}`;
      const localMediaUrl = URL.createObjectURL(file);
      const timelineTimestamp = getOptimisticTimelineTimestamp({
        convId,
        queryClient,
      });
      const optimisticMessage: ChatMessage = {
        id: optimisticId,
        messageId: null,
        conversationId: convId,
        direction: 'outgoing',
        source: 'admin',
        type: getMediaTypeFromFile(file),
        content: caption?.trim() || null,
        mediaObjectKey: null,
        mediaMimeType: file.type,
        mediaFilename: file.name,
        mediaSize: file.size,
        status: 'sending',
        errorMessage: null,
        localMediaUrl,
        timestamp: timelineTimestamp,
        createdAt: timelineTimestamp,
      };

      insertOptimisticMessage({
        convId,
        message: optimisticMessage,
        queryClient,
      });

      return { localMediaUrl, optimisticId };
    },
    onError: (err, { convId }, context) => {
      toast.error(err.message || 'Failed to send media');

      markOptimisticMessageAsFailed({
        convId,
        errorMessage: err.message,
        optimisticId: context?.optimisticId,
        queryClient,
      });
    },
    onSuccess: ({ conversation, message }, { convId, wabaId }, context) => {
      if (context?.localMediaUrl) {
        // Keep the local media URL around in the confirmed message to prevent a
        // visual flicker while the S3 download URL is being fetched in the background.
        message.localMediaUrl = context.localMediaUrl;
      }

      updateCachesWithConfirmedMessage({
        conversation,
        convId,
        message,
        optimisticId: context?.optimisticId,
        queryClient,
        wabaId,
      });
    },
  });
}
