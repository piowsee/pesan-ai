import type { MessageGroup } from '@/hooks/use-message';

export type UnreadDividerSnapshotMap = Record<string, number>;

function hasOwnSnapshot(
  snapshotByConversation: UnreadDividerSnapshotMap,
  conversationId: string,
) {
  return Object.prototype.hasOwnProperty.call(
    snapshotByConversation,
    conversationId,
  );
}

export function hasUnreadDividerSnapshot({
  conversationId,
  snapshotByConversation,
}: {
  conversationId?: string;
  snapshotByConversation: UnreadDividerSnapshotMap;
}) {
  return Boolean(
    conversationId && hasOwnSnapshot(snapshotByConversation, conversationId),
  );
}

export function getUnreadDividerInitialCount({
  conversationId,
  conversationUnreadCount,
  snapshotByConversation,
}: {
  conversationId?: string;
  conversationUnreadCount?: number;
  snapshotByConversation: UnreadDividerSnapshotMap;
}) {
  if (!conversationId) {
    return 0;
  }

  if (hasOwnSnapshot(snapshotByConversation, conversationId)) {
    return snapshotByConversation[conversationId] ?? 0;
  }

  return conversationUnreadCount ?? 0;
}

export function captureUnreadDividerSnapshot({
  conversationId,
  snapshotByConversation,
  unreadCount,
}: {
  conversationId: string;
  snapshotByConversation: UnreadDividerSnapshotMap;
  unreadCount: number;
}) {
  if (unreadCount > 0) {
    return { ...snapshotByConversation, [conversationId]: unreadCount };
  }

  const next = { ...snapshotByConversation };
  delete next[conversationId];
  return next;
}

export function clearUnreadDividerSnapshot({
  conversationId,
  snapshotByConversation,
}: {
  conversationId: string;
  snapshotByConversation: UnreadDividerSnapshotMap;
}) {
  return { ...snapshotByConversation, [conversationId]: 0 };
}

export function removeUnreadDividerSnapshot({
  conversationId,
  snapshotByConversation,
}: {
  conversationId: string;
  snapshotByConversation: UnreadDividerSnapshotMap;
}) {
  const next = { ...snapshotByConversation };
  delete next[conversationId];
  return next;
}

export function getUnreadBoundaryMessageId({
  messages,
  unreadCount,
}: {
  messages: MessageGroup[];
  unreadCount: number;
}) {
  if (unreadCount <= 0) {
    return undefined;
  }

  const incomingMessages = messages
    .flatMap((group) => group.messages)
    .filter((message) => message.direction === 'incoming');

  return incomingMessages.at(-unreadCount)?.id ?? incomingMessages[0]?.id;
}

export function shouldRenderUnreadDivider({
  messageId,
  unreadBoundaryMessageId,
}: {
  messageId: string;
  unreadBoundaryMessageId?: string;
}) {
  return Boolean(
    unreadBoundaryMessageId && messageId === unreadBoundaryMessageId,
  );
}

export function getUnreadMessageIdsFromBoundary({
  messages,
  unreadBoundaryMessageId,
}: {
  messages: MessageGroup[];
  unreadBoundaryMessageId?: string;
}) {
  if (!unreadBoundaryMessageId) {
    return [];
  }

  let hasReachedBoundary = false;

  return messages.flatMap((group) =>
    group.messages.flatMap((message) => {
      if (message.id === unreadBoundaryMessageId) {
        hasReachedBoundary = true;
      }

      return hasReachedBoundary && message.direction === 'incoming'
        ? [message.id]
        : [];
    }),
  );
}

export function UnreadMessagesDivider() {
  return (
    <div className="flex items-center gap-3 py-1" aria-label="Unread messages">
      <div className="h-px flex-1 bg-brand/20" />
      <span className="rounded-full bg-background/95 px-3 py-1 text-[11px] font-semibold text-brand shadow-sm backdrop-blur-sm">
        Unread messages
      </span>
      <div className="h-px flex-1 bg-brand/20" />
    </div>
  );
}
