import AudioMessageBubble from '@/components/ui/audio-message-bubble';

import { MessageCaption } from './message-caption';
import type { MediaRendererProps } from './types';

function AudioMessage({ downloadUrl, message }: MediaRendererProps) {
  return (
    <div className="flex min-w-64 flex-col gap-2">
      <AudioMessageBubble audioSrc={downloadUrl} />
      <MessageCaption content={message.content} />
    </div>
  );
}

export { AudioMessage };
