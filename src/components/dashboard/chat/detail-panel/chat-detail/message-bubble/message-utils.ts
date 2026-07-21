import type { ChatMessage } from '@/types/chat';
import {
  FileTextIcon,
  ImageIcon,
  type LucideIcon,
  MusicIcon,
  VideoIcon,
} from 'lucide-react';

import type { MediaMessageType } from './types';

type VisualMediaOrientation = 'landscape' | 'portrait' | 'square';

const mediaTypeIcons = {
  audio: MusicIcon,
  document: FileTextIcon,
  image: ImageIcon,
  video: VideoIcon,
} satisfies Record<MediaMessageType, LucideIcon>;

function isMediaMessageType(type: string): type is MediaMessageType {
  return type in mediaTypeIcons;
}

function formatByteSize(size: number | null) {
  if (size === null) {
    return null;
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)}${units[unitIndex]}`;
}

function getMediaTitle(message: ChatMessage, fallback: string) {
  return message.mediaFilename || message.mediaMimeType || fallback;
}

function getVisualMediaOrientation(
  width: number,
  height: number,
): VisualMediaOrientation {
  const aspectRatio = width / height;

  if (aspectRatio > 1.08) {
    return 'landscape';
  }

  if (aspectRatio < 0.92) {
    return 'portrait';
  }

  return 'square';
}

export {
  formatByteSize,
  getMediaTitle,
  getVisualMediaOrientation,
  isMediaMessageType,
  mediaTypeIcons,
};
export type { VisualMediaOrientation };
