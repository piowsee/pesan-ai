export type ChatSidebarFilter = 'all' | 'unread';

export type ChatMessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface ChatBusinessProfile {
  profilePictureUrl: string | null;
}

export interface ChatPhoneNumberSummary {
  id: string;
  displayPhoneNumber: string;
  businessProfile?: ChatBusinessProfile | null;
}

export interface ChatMessage {
  id: string;
  messageId: string | null;
  conversationId: string;
  direction: 'incoming' | 'outgoing';
  source: 'customer' | 'admin' | 'bot';
  type: string;
  content: string | null;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  mediaFilename: string | null;
  mediaSize: string | null;
  status: ChatMessageStatus | string;
  errorMessage: string | null;
  metadata: string | null;
  timestamp: string;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  customerPhone: string;
  customerName: string | null;
  displayName: string;
  adminTakeover: boolean;
  lastMessageAt: string | null;
  lastCustomerMessageAt: string | null;
  unreadCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  canSendFreeform: boolean;
  freeformWindowEndsAt: string | null;
  phoneNumber: ChatPhoneNumberSummary;
  lastMessage: ChatMessage | null;
}

export interface ChatConversationListResponse {
  chats: ChatConversation[];
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
}

export interface ChatMessageListResponse {
  messages: ChatMessage[];
  nextBefore: string | null;
  limit: number;
}
