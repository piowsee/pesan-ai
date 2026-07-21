import type { ChatMessage } from '@/types/chat';

export const CHAT_SIDEBAR_PAGE_SIZE = 25;
export const CHAT_MESSAGE_PAGE_SIZE = 30;
export const CHAT_FREEFORM_WINDOW_MS = 24 * 60 * 60 * 1000;
export const CHAT_MESSAGE_CHARACTER_LIMIT = 4096;

export function isFreeformWindowOpen(lastCustomerMessageAt?: string | null) {
  if (!lastCustomerMessageAt) {
    return false;
  }

  return (
    Date.now() - new Date(lastCustomerMessageAt).getTime() <=
    CHAT_FREEFORM_WINDOW_MS
  );
}

export function getConversationDisplayName(
  customerName?: string | null,
  customerPhone?: string | null,
) {
  return customerName?.trim() || customerPhone?.trim() || 'Unknown contact';
}

const mediaPreviewLabels = {
  audio: 'Audio',
  document: 'Document',
  image: 'Photo',
  video: 'Video',
} as const;

export type MediaPreviewMessageType = keyof typeof mediaPreviewLabels;

export function isMediaPreviewMessageType(
  type: string,
): type is MediaPreviewMessageType {
  return type in mediaPreviewLabels;
}

export function getMediaPreviewLabel(type: MediaPreviewMessageType) {
  return mediaPreviewLabels[type];
}

export function getMessagePreview(
  message?: Pick<ChatMessage, 'type' | 'content' | 'mediaFilename'> | null,
) {
  if (!message) {
    return 'No messages yet';
  }

  if (message.type === 'text' && message.content?.trim()) {
    return message.content.trim();
  }

  if (isMediaPreviewMessageType(message.type)) {
    if (message.content?.trim()) {
      return message.content.trim();
    }
    if (message.mediaFilename?.trim()) {
      return message.mediaFilename.trim();
    }
    return getMediaPreviewLabel(message.type);
  }

  return `Unsupported ${message.type} message`;
}
