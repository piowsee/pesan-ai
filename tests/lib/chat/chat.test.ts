import {
  getMediaPreviewLabel,
  getMessagePreview,
  isMediaPreviewMessageType,
} from '@/lib/chat/chat';
import { describe, expect, it } from 'vitest';

describe('chat preview helpers', () => {
  it('returns a text message preview from trimmed content', () => {
    expect(
      getMessagePreview({ type: 'text', content: '  hello  ' } as never),
    ).toBe('hello');
  });

  it('returns an empty-state preview when there is no message', () => {
    expect(getMessagePreview(null)).toBe('No messages yet');
  });

  it.each([
    ['document', 'Document'],
    ['image', 'Photo'],
    ['video', 'Video'],
    ['audio', 'Audio'],
  ] as const)('returns %s media preview label', (type, label) => {
    expect(isMediaPreviewMessageType(type)).toBe(true);
    expect(getMediaPreviewLabel(type)).toBe(label);
    expect(getMessagePreview({ type } as never)).toBe(label);
    expect(getMessagePreview({ type, content: 'caption' } as never)).toBe(
      'caption',
    );
  });
});
