import { MessageCaption } from './message-caption';
import type { MediaRendererProps } from './types';

function VideoMessage({ downloadUrl, message }: MediaRendererProps) {
  return (
    <div className="flex flex-col gap-2">
      <video
        controls
        preload="metadata"
        src={downloadUrl}
        className="max-h-80 w-full rounded-xl bg-background/50"
      />
      <MessageCaption content={message.content} />
    </div>
  );
}

export { VideoMessage };
