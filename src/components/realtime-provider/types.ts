import type { RawConversation } from '@/hooks/use-conversations';
import type { ChatMessage } from '@/types/chat';

export interface RealtimeContextType {
  setViewingConversationId: (id: string | undefined) => void;
  activate: () => void;
}

export interface SSEMessagePayload extends ChatMessage {
  wabaId: string;
  conversation: RawConversation;
}

export interface MessagePageCache {
  messages: ChatMessage[];
  total: number;
  page: number;
  limit: number;
}
