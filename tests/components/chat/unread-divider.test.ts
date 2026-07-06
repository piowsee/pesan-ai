import {
  type UnreadDividerSnapshotMap,
  type UnreadDividerSnapshotMap,
  captureUnreadDividerSnapshot,
  clearUnreadDividerSnapshot,
  getUnreadBoundaryMessageId,
  getUnreadDividerInitialCount,
  hasUnreadDividerSnapshot,
  shouldRenderUnreadDivider,
} from '@/components/chat/shared/unread-divider';
import { describe, expect, it } from 'vitest';

describe('unread divider logic', () => {
  it('uses the conversation unread count before a snapshot exists', () => {
    expect(
      getUnreadDividerInitialCount({
        conversationId: 'conversation-1',
        conversationUnreadCount: 3,
        snapshotByConversation: {},
      }),
    ).toBe(3);
  });

  it('captures the unread count that should anchor the divider', () => {
    const snapshots = captureUnreadDividerSnapshot({
      conversationId: 'conversation-1',
      snapshotByConversation: {},
      unreadCount: 2,
    });

    expect(snapshots).toEqual({ 'conversation-1': 2 });
    expect(
      hasUnreadDividerSnapshot({
        conversationId: 'conversation-1',
        snapshotByConversation: snapshots,
      }),
    ).toBe(true);
  });

  it('treats a cleared snapshot as explicit so stale unread counts do not restore the divider', () => {
    const snapshots = clearUnreadDividerSnapshot({
      conversationId: 'conversation-1',
      snapshotByConversation: { 'conversation-1': 4 },
    });

    expect(snapshots).toEqual({ 'conversation-1': 0 });
    expect(
      hasUnreadDividerSnapshot({
        conversationId: 'conversation-1',
        snapshotByConversation: snapshots,
      }),
    ).toBe(true);
    expect(
      getUnreadDividerInitialCount({
        conversationId: 'conversation-1',
        conversationUnreadCount: 4,
        snapshotByConversation: snapshots,
      }),
    ).toBe(0);
  });

  it('removes a zero-unread snapshot when selecting a read conversation', () => {
    const snapshots: UnreadDividerSnapshotMap = {
      'conversation-1': 0,
      'conversation-2': 5,
    };

    expect(
      captureUnreadDividerSnapshot({
        conversationId: 'conversation-1',
        snapshotByConversation: snapshots,
        unreadCount: 0,
      }),
    ).toEqual({ 'conversation-2': 5 });
  });

  it('places the divider before the first unread incoming message', () => {
    const unreadBoundaryMessageId = getUnreadBoundaryMessageId({
      messages: [
        {
          date: '2026-07-06',
          messages: [
            { id: 'incoming-1', direction: 'incoming' },
            { id: 'outgoing-1', direction: 'outgoing' },
            { id: 'incoming-2', direction: 'incoming' },
            { id: 'incoming-3', direction: 'incoming' },
          ],
        },
      ] as never,
      unreadCount: 2,
    });

    expect(unreadBoundaryMessageId).toBe('incoming-2');
    expect(
      shouldRenderUnreadDivider({
        messageId: 'incoming-2',
        unreadBoundaryMessageId,
      }),
    ).toBe(true);
    expect(
      shouldRenderUnreadDivider({
        messageId: 'incoming-3',
        unreadBoundaryMessageId,
      }),
    ).toBe(false);
  });
});
