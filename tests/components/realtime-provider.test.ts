import {
  applyBotWebhookFailureToConversations,
  applyConversationUpdateToConversations,
  applyRealtimeMessageToConversation,
  applyRealtimeMessageToMessagePage,
  isIncomingCustomerMessage,
  refetchRealtimeCache,
} from '@/components/realtime-provider';
import { conversationKeys } from '@/hooks/use-conversations';
import type { ChatConversation, ChatMessage } from '@/types/chat';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const NOW = new Date('2026-06-28T12:00:00.000Z');

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
    metadata: null,
    timestamp: NOW.toISOString(),
    createdAt: NOW.toISOString(),
    ...overrides,
  };
}

function createConversation(
  overrides: Partial<ChatConversation> = {},
): ChatConversation {
  return {
    id: 'conversation-1',
    customerPhone: '628111111111',
    customerName: null,
    displayName: '628111111111',
    adminTakeover: false,
    lastMessageAt: null,
    lastCustomerMessageAt: null,
    unreadCount: 0,
    status: 'active',
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    canSendFreeform: false,
    freeformWindowEndsAt: null,
    phoneNumber: {
      id: 'phone-1',
      displayPhoneNumber: '628222222222',
    },
    lastMessage: null,
    ...overrides,
  };
}

describe('realtime conversation updates', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens the free-form window for an incoming customer message', () => {
    const message = createMessage();

    const result = applyRealtimeMessageToConversation({
      chat: createConversation(),
      message,
      adminTakeover: false,
      isActive: false,
    });

    expect(isIncomingCustomerMessage(message)).toBe(true);
    expect(result.lastCustomerMessageAt).toBe(NOW.toISOString());
    expect(result.canSendFreeform).toBe(true);
    expect(result.unreadCount).toBe(1);
  });

  it('does not open the window or increase unread count for an app echo', () => {
    const message = createMessage({
      direction: 'outgoing',
      source: 'whatsapp_app',
    });

    const result = applyRealtimeMessageToConversation({
      chat: createConversation(),
      message,
      adminTakeover: false,
      isActive: false,
    });

    expect(isIncomingCustomerMessage(message)).toBe(false);
    expect(result.lastCustomerMessageAt).toBeNull();
    expect(result.canSendFreeform).toBe(false);
    expect(result.unreadCount).toBe(0);
  });

  it('preserves an existing customer window when an app echo arrives', () => {
    const lastCustomerMessageAt = new Date(
      NOW.getTime() - 60 * 60 * 1000,
    ).toISOString();

    const result = applyRealtimeMessageToConversation({
      chat: createConversation({
        lastCustomerMessageAt,
        canSendFreeform: true,
      }),
      message: createMessage({
        direction: 'outgoing',
        source: 'whatsapp_app',
      }),
      adminTakeover: false,
      isActive: false,
    });

    expect(result.lastCustomerMessageAt).toBe(lastCustomerMessageAt);
    expect(result.canSendFreeform).toBe(true);
  });

  it('replaces an existing cached message when a realtime message has the same internal id', () => {
    const loadingMessage = createMessage({
      id: 'message-1',
      status: 'sending',
      mediaObjectKey: null,
    });
    const realtimeMessage = createMessage({
      id: 'message-1',
      status: 'sent',
      mediaObjectKey: 'user-1/uploaded-media',
    });

    const result = applyRealtimeMessageToMessagePage(
      {
        messages: [loadingMessage],
        total: 1,
        page: 1,
        limit: 50,
      },
      realtimeMessage,
    );

    expect(result.messages).toEqual([realtimeMessage]);
    expect(result.total).toBe(1);
  });

  it('adds a realtime message when its internal id is not already cached', () => {
    const existingMessage = createMessage({ id: 'message-1' });
    const realtimeMessage = createMessage({ id: 'message-2' });

    const result = applyRealtimeMessageToMessagePage(
      {
        messages: [existingMessage],
        total: 1,
        page: 1,
        limit: 50,
      },
      realtimeMessage,
    );

    expect(result.messages).toEqual([realtimeMessage, existingMessage]);
    expect(result.total).toBe(2);
  });

  it('does not replace the latest conversation message with an older app echo', () => {
    const latestTimestamp = NOW.toISOString();
    const latestMessage = createMessage({
      id: 'message-latest',
      timestamp: latestTimestamp,
    });
    const olderTimestamp = new Date(
      NOW.getTime() - 60 * 60 * 1000,
    ).toISOString();

    const result = applyRealtimeMessageToConversation({
      chat: createConversation({
        lastMessage: latestMessage,
        lastMessageAt: latestTimestamp,
        unreadCount: 2,
      }),
      message: createMessage({
        id: 'message-older-echo',
        direction: 'outgoing',
        source: 'whatsapp_app',
        timestamp: olderTimestamp,
      }),
      adminTakeover: false,
      isActive: false,
    });

    expect(result.lastMessage).toBe(latestMessage);
    expect(result.lastMessageAt).toBe(latestTimestamp);
    expect(result.unreadCount).toBe(2);
  });

  it('updates admin takeover without adding a message from a conversation event', () => {
    const conversations = [
      createConversation(),
      createConversation({ id: 'conversation-2' }),
    ];

    const result = applyConversationUpdateToConversations(conversations, {
      conversationId: 'conversation-1',
      wabaId: 'waba-1',
      adminTakeover: true,
    });

    expect(result[0]).toMatchObject({
      id: 'conversation-1',
      adminTakeover: true,
      lastMessage: null,
    });
    expect(result[1]).toBe(conversations[1]);
  });

  it('updates admin takeover without adding a message after bot webhook failure', () => {
    const conversations = [
      createConversation(),
      createConversation({ id: 'conversation-2' }),
    ];

    const result = applyBotWebhookFailureToConversations(conversations, {
      conversationId: 'conversation-1',
      wabaId: 'waba-1',
      adminTakeover: true,
    });

    expect(result[0]).toMatchObject({
      id: 'conversation-1',
      adminTakeover: true,
      lastMessage: null,
    });
    expect(result[1]).toBe(conversations[1]);
  });

  it('cancels stale loading data before refetching a missing cache', async () => {
    const queryClient = new QueryClient();
    const cancelQueries = vi
      .spyOn(queryClient, 'cancelQueries')
      .mockResolvedValue();
    const invalidateQueries = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue();
    const queryKey = conversationKeys.all('waba-1');

    await refetchRealtimeCache(queryClient, queryKey, true);

    const filters = { queryKey, exact: true };
    expect(cancelQueries).toHaveBeenCalledWith(filters);
    expect(invalidateQueries).toHaveBeenCalledWith(filters);
  });
});
