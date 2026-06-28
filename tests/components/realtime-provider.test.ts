import {
  applyRealtimeMessageToConversation,
  isIncomingCustomerMessage,
} from '@/components/realtime-provider';
import type { ChatConversation, ChatMessage } from '@/types/chat';
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
    mediaUrl: null,
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
});
