import type { MessageRendererProps } from './types';

function TextMessage({ message }: MessageRendererProps) {
  return (
    <div className="whitespace-pre-wrap wrap-anywhere text-[15px] leading-relaxed">
      {message.content ?? ''}
    </div>
  );
}

export { TextMessage };
