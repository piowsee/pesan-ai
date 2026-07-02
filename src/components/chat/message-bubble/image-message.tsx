import { MessageCaption } from './message-caption';
import type { MediaRendererProps } from './types';

function ImageMessage({ downloadUrl, message }: MediaRendererProps) {
  const alt = message.content || message.mediaFilename || 'Image message';

  return (
    <div className="flex flex-col gap-2">
      <a
        href={downloadUrl}
        target="_blank"
        rel="noreferrer"
        className="block overflow-hidden rounded-xl bg-background/50"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Presigned object-storage URLs are dynamic and may come from different storage hosts. */}
        <img
          src={downloadUrl}
          alt={alt}
          loading="lazy"
          className="max-h-80 w-full object-cover"
        />
      </a>
      <MessageCaption content={message.content} />
    </div>
  );
}

export { ImageMessage };
