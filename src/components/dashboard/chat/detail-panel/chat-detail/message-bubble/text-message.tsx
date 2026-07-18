import type { MessageRendererProps } from './types';

function TextMessage({ message }: MessageRendererProps) {
  return (
    <div className="whitespace-pre-wrap wrap-anywhere text-[14px] leading-relaxed">
      {message.content ?? ''}
      {/* Spacer to prevent text from overlapping the absolutely positioned time */}
      <span
        className={`inline-block h-1 ${message.direction === 'outgoing' ? 'w-[72px]' : 'w-[52px]'}`}
      />
    </div>
  );
}

export { TextMessage };
