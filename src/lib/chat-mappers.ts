import {
  getConversationDisplayName,
  getFreeformWindowEndsAt,
  isFreeformWindowOpen,
  serializeBigInt,
  serializeDate,
} from '@/lib/chat';
import type { ChatConversation, ChatMessage } from '@/types/chat';

type MessageRecord = {
  id: string;
  messageId?: string | null;
  conversationId: string;
  direction: string;
  source: string;
  type: string;
  content?: string | null;
  mediaUrl?: string | null;
  mediaMimeType?: string | null;
  mediaFilename?: string | null;
  mediaSize?: bigint | null;
  status: string;
  errorMessage?: string | null;
  metadata?: string | null;
  timestamp: Date | string;
  createdAt?: Date | string;
};

type ConversationRecord = {
  id: string;
  customerPhone: string;
  customerName?: string | null;
  adminTakeover: boolean;
  lastMessageAt?: Date | string | null;
  lastCustomerMessageAt?: Date | string | null;
  unreadCount: number;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  phoneNumber: {
    id: string;
    displayPhoneNumber: string;
    businessProfile?: {
      profilePictureUrl?: string | null;
    } | null;
  };
  lastMessage?: MessageRecord | null;
  messages?: MessageRecord[];
};

export function toChatMessage(message: MessageRecord): ChatMessage {
  return {
    id: message.id,
    messageId: message.messageId ?? null,
    conversationId: message.conversationId,
    direction: message.direction as ChatMessage['direction'],
    source: message.source as ChatMessage['source'],
    type: message.type,
    content: message.content ?? null,
    mediaUrl: message.mediaUrl ?? null,
    mediaMimeType: message.mediaMimeType ?? null,
    mediaFilename: message.mediaFilename ?? null,
    mediaSize: serializeBigInt(message.mediaSize),
    status: message.status,
    errorMessage: message.errorMessage ?? null,
    metadata: message.metadata ?? null,
    timestamp: serializeDate(message.timestamp)!,
    createdAt: serializeDate(message.createdAt ?? message.timestamp)!,
  };
}

export function toChatConversation(
  conversation: ConversationRecord,
): ChatConversation {
  const lastMessage =
    conversation.lastMessage ?? conversation.messages?.[0] ?? null;
  const lastCustomerMessageAt = serializeDate(
    conversation.lastCustomerMessageAt,
  );

  return {
    id: conversation.id,
    customerPhone: conversation.customerPhone,
    customerName: conversation.customerName ?? null,
    displayName: getConversationDisplayName(
      conversation.customerName,
      conversation.customerPhone,
    ),
    adminTakeover: conversation.adminTakeover,
    lastMessageAt: serializeDate(conversation.lastMessageAt),
    lastCustomerMessageAt,
    unreadCount: conversation.unreadCount,
    status: conversation.status,
    createdAt: serializeDate(conversation.createdAt)!,
    updatedAt: serializeDate(conversation.updatedAt)!,
    canSendFreeform: isFreeformWindowOpen(lastCustomerMessageAt),
    freeformWindowEndsAt: getFreeformWindowEndsAt(lastCustomerMessageAt),
    phoneNumber: {
      id: conversation.phoneNumber.id,
      displayPhoneNumber: conversation.phoneNumber.displayPhoneNumber,
      businessProfile: conversation.phoneNumber.businessProfile
        ? {
            profilePictureUrl:
              conversation.phoneNumber.businessProfile.profilePictureUrl ??
              null,
          }
        : null,
    },
    lastMessage: lastMessage ? toChatMessage(lastMessage) : null,
  };
}
