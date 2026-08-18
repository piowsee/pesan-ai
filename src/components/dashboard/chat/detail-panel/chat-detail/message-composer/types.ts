import type { RefObject } from 'react';

export type MediaPickerType = 'audio' | 'document' | 'photo-video';

export type SelectedMedia = {
  file: File;
  previewUrl: string;
  caption?: string;
};

export type SendMediaMessageBatchInput = {
  files: Array<{ file: File; caption?: string }>;
};

export type MediaInputRefs = Record<
  MediaPickerType,
  RefObject<HTMLInputElement | null>
>;

export type TextFormatLabelKey =
  | 'closeFormatToolbar'
  | 'formatBold'
  | 'formatBulletedList'
  | 'formatCode'
  | 'formatItalic'
  | 'formatNumberedList'
  | 'formatQuote'
  | 'formatStrikethrough';
