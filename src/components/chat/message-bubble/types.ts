import type { ChatMessage } from '@/types/chat';

export type MediaMessageType = 'audio' | 'document' | 'image' | 'video';
export type SupportedMessageType = MediaMessageType | 'text';

export type MessageRendererProps = {
  message: ChatMessage;
};

export type MediaRendererProps = MessageRendererProps & {
  downloadUrl: string;
  getFreshDownloadUrl?: () => Promise<string>;
  isDownloadUrlStale?: boolean;
};
