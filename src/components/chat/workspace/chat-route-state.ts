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

export const CHAT_BASE_HREF = '/dashboard/chat';

export const CHAT_STATE_STORAGE_KEY = 'dashboard-chat-state';

const CHAT_STATE_CHANGE_EVENT = 'dashboard-chat-state-change';

function notifyStoredChatStateChanged(): void {
  window.dispatchEvent(new Event(CHAT_STATE_CHANGE_EVENT));
}

export interface StoredChatState {
  wabaId?: string;
  convId?: string;
  params: string;
}

function parseStoredChatState(raw: string | null): StoredChatState | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as StoredChatState).params === 'string'
    ) {
      return parsed as StoredChatState;
    }
  } catch {
    // Ignore malformed/legacy storage values.
  }

  return null;
}

/**
 * Reads the last waba/conversation/params the user was viewing in Chat.
 * Returns `null` on the server or when nothing (valid) has been stored yet.
 */
export function readStoredChatState(): StoredChatState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return parseStoredChatState(
    window.localStorage.getItem(CHAT_STATE_STORAGE_KEY),
  );
}

/**
 * Persists the waba/conversation/params currently being viewed in Chat, so
 * navigating back into Chat later (e.g. from the nav bar) can restore it.
 * A stored state always requires a `wabaId`; without one there is nothing
 * meaningful to restore.
 */
export function writeStoredChatState(state: StoredChatState): void {
  if (typeof window === 'undefined' || !state.wabaId) {
    return;
  }

  window.localStorage.setItem(CHAT_STATE_STORAGE_KEY, JSON.stringify(state));
  notifyStoredChatStateChanged();
}

export function clearStoredChatState(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(CHAT_STATE_STORAGE_KEY);
  notifyStoredChatStateChanged();
}

export function subscribeStoredChatState(
  onStoreChange: () => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === CHAT_STATE_STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener(CHAT_STATE_CHANGE_EVENT, onStoreChange);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(CHAT_STATE_CHANGE_EVENT, onStoreChange);
    window.removeEventListener('storage', handleStorage);
  };
}

/**
 * Builds the href the Chat nav entry should point to: the last visited
 * waba/conversation (with its filter/panel state) when one is stored,
 * otherwise the plain Chat base route.
 */
export function getStoredChatHref(): string {
  const stored = readStoredChatState();

  if (!stored?.wabaId) {
    return CHAT_BASE_HREF;
  }

  const searchParams = pickChatSearchParams(
    stored.params,
    CHAT_DETAIL_PARAM_KEYS,
  );

  return buildChatHref({
    wabaId: stored.wabaId,
    conversationId: stored.convId,
    searchParams,
  });
}
