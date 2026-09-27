import AudioMessageBubble from '@/components/ui/audio-message-bubble';

import { MessageCaption } from './message-caption';
import type { MediaRendererProps } from './types';

function AudioMessage({
  downloadUrl,
  getFreshDownloadUrl,
  isDownloadUrlStale,
  message,
  metadata,
}: MediaRendererProps) {
  return (
    <div className="flex flex-col gap-0.5 w-76 max-w-[calc(100vw-3rem)]">
      <AudioMessageBubble
        className="w-full max-w-none"
        audioSrc={downloadUrl}
        metadata={message.content ? undefined : metadata}
        getFreshAudioSrc={
          isDownloadUrlStale && getFreshDownloadUrl
            ? getFreshDownloadUrl
            : undefined
        }
      />
      <MessageCaption content={message.content} metadata={metadata} />
    </div>
  );
}

export { AudioMessage };
