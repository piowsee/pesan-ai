import { MessageCaption } from './message-caption';
import type { MediaRendererProps } from './types';

function AudioMessage({ downloadUrl, message }: MediaRendererProps) {
  return (
    <div className="flex min-w-56 flex-col gap-2">
      <audio controls preload="metadata" src={downloadUrl} className="w-full" />
      <MessageCaption content={message.content} />
    </div>
  );
}

export { AudioMessage };
