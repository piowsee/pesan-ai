import type { ReactNode } from 'react';

function MessageCaption({
  content,
  metadata,
}: {
  content: string | null;
  metadata: ReactNode;
}) {
  if (!content) {
    return null;
  }

  return (
    <div className="relative min-h-7 px-1.5 pt-1 pb-1">
      <p className="whitespace-pre-wrap wrap-anywhere text-[14px] leading-relaxed">
        {content}
        <span className="inline-block h-1 w-16" />
      </p>
      <div className="absolute right-2 bottom-1.5">{metadata}</div>
    </div>
  );
}

export { MessageCaption };
