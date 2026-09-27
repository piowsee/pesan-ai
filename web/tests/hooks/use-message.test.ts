import {
  getMediaObjectKeysFromMessageGroups,
  groupMessagesByDate,
} from '@/hooks/use-message';
import type { ChatMessage } from '@/types/chat';
import { describe, expect, it } from 'vitest';

function createMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'message-1',
    messageId: 'wamid.message-1',
    conversationId: 'conversation-1',
    direction: 'incoming',
    source: 'customer',
    type: 'text',
    content: 'Hello',
    mediaObjectKey: null,
    mediaMimeType: null,
    mediaFilename: null,
    mediaSize: null,
    status: 'delivered',
    errorMessage: null,
    timestamp: '2026-07-06T10:00:00.000Z',
    createdAt: '2026-07-06T10:00:00.000Z',
    ...overrides,
  };
}

describe('groupMessagesByDate', () => {
  it('keeps optimistic outgoing messages after unread messages when they share the latest timeline timestamp', () => {
    const grouped = groupMessagesByDate([
      createMessage({
        id: 'optimistic-outgoing',
        direction: 'outgoing',
        source: 'admin',
        status: 'sending',
        timestamp: '2026-07-06T10:00:00.000Z',
        createdAt: '2026-07-06T10:00:00.000Z',
      }),
      createMessage({
        id: 'incoming-unread-2',
        timestamp: '2026-07-06T10:00:00.000Z',
        createdAt: '2026-07-06T10:00:00.000Z',
      }),
      createMessage({
        id: 'incoming-unread-1',
        timestamp: '2026-07-06T09:59:00.000Z',
        createdAt: '2026-07-06T09:59:00.000Z',
      }),
    ]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.messages.map((message) => message.id)).toEqual([
      'incoming-unread-1',
      'incoming-unread-2',
      'optimistic-outgoing',
    ]);
  });
});

describe('getMediaObjectKeysFromMessageGroups', () => {
  it('deduplicates persisted media keys and skips local optimistic media', () => {
    const groups = groupMessagesByDate([
      createMessage({
        id: 'text-message',
        type: 'text',
      }),
      createMessage({
        id: 'image-message',
        type: 'image',
        mediaMimeType: 'image/png',
        mediaObjectKey: 'user-1/waba-1/conv-1/image',
      }),
      createMessage({
        id: 'duplicate-image-message',
        type: 'image',
        mediaMimeType: 'image/png',
        mediaObjectKey: 'user-1/waba-1/conv-1/image',
      }),
      createMessage({
        id: 'document-message',
        type: 'document',
        mediaMimeType: 'application/pdf',
        mediaObjectKey: 'user-1/waba-1/conv-1/document',
      }),
      createMessage({
        id: 'optimistic-media',
        type: 'image',
        mediaMimeType: 'image/png',
        mediaObjectKey: 'user-1/waba-1/conv-1/local',
        localMediaUrl: 'blob:http://localhost/local',
      }),
    ]);

    expect(getMediaObjectKeysFromMessageGroups(groups)).toEqual([
      'user-1/waba-1/conv-1/document',
      'user-1/waba-1/conv-1/image',
    ]);
  });
});
