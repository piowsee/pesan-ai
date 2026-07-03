export const CHAT_BASE_PARAM_KEYS = ['filter', 'q'] as const;
export const CHAT_LIST_PARAM_KEYS = ['filter', 'phoneNumberId', 'q'] as const;
export const CHAT_DETAIL_PARAM_KEYS = [
  'filter',
  'phoneNumberId',
  'q',
  'panel',
] as const;

export type ChatStateParamKey = (typeof CHAT_DETAIL_PARAM_KEYS)[number];
export type ChatStateParamKeys = readonly ChatStateParamKey[];

export function getChatRouteSelection(
  chatSegments: string[] | string | undefined,
) {
  const segments = Array.isArray(chatSegments)
    ? chatSegments
    : chatSegments
      ? [chatSegments]
      : [];

  return {
    selectedWabaId: segments[0],
    selectedConversationId: segments[1],
    hasInvalidRouteDepth: segments.length > 2,
  };
}

export function pickChatSearchParams(
  input: string | URLSearchParams,
  keys: ChatStateParamKeys,
) {
  const source = typeof input === 'string' ? new URLSearchParams(input) : input;
  const params = new URLSearchParams();

  keys.forEach((key) => {
    const value = source.get(key);
    if (value) {
      params.set(key, value);
    }
  });

  return params;
}

export function applyChatSearchParamUpdates(
  params: URLSearchParams,
  updates: Partial<Record<ChatStateParamKey, string | undefined>>,
) {
  Object.entries(updates).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  });

  return params;
}

export function buildChatHref({
  conversationId,
  searchParams,
  wabaId,
}: {
  wabaId?: string;
  conversationId?: string;
  searchParams?: URLSearchParams;
}) {
  const base = wabaId
    ? conversationId
      ? `/dashboard/chat/${encodeURIComponent(wabaId)}/${encodeURIComponent(
          conversationId,
        )}`
      : `/dashboard/chat/${encodeURIComponent(wabaId)}`
    : '/dashboard/chat';

  const query = searchParams?.toString();
  return query ? `${base}?${query}` : base;
}
