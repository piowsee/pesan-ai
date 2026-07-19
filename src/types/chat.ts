export type ChatSidebarFilter = 'all' | 'admin' | 'bot';

/**
 * `whatsapp_app` identifies messages received through WhatsApp Business App
 * data flows: live message echoes and every history-sync message, regardless
 * of whether the original sender was the customer or business owner.
 * Only realtime inbound customer messages use `customer`.
 */
export type ChatMessageSource = 'customer' | 'admin' | 'bot' | 'whatsapp_app';

export interface ChatBusinessProfile {
  profilePictureUrl: string | null;
}

export interface ChatMessage {
  id: string;
  messageId: string | null;
  conversationId: string;
  direction: 'incoming' | 'outgoing';
  source: ChatMessageSource;
  type: string;
  content: string | null;
  mediaObjectKey: string | null;
  mediaMimeType: string | null;
  mediaFilename: string | null;
  mediaSize: number | null;
  status: string;
  errorMessage: string | null;
  localMediaUrl?: string | null;
  timestamp: string;
  createdAt: string;
  optimisticId?: string;
}

export interface ChatConversation {
  id: string;
  customerPhone: string | null;
  customerName: string | null;
  customerUsername: string | null;
  displayName: string;
  contactIdentifier: string;
  adminTakeover: boolean;
  lastMessageAt: string | null;
  lastCustomerMessageAt: string | null;
  unreadCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  messagingProduct: string;
  canSendFreeform: boolean;
  freeformWindowEndsAt: string | null;
  phoneNumber: {
    id: string;
    displayPhoneNumber: string;
    businessProfile?: ChatBusinessProfile | null;
  };
  lastMessage: ChatMessage | null;
}
