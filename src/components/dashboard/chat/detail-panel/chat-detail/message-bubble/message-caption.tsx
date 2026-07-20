import type { ReactNode } from 'react';

import { WhatsAppText } from '../whatsapp-text';

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
      <WhatsAppText content={content} trailingSpacerClassName="w-16" />
      <div className="absolute right-2 bottom-1.5">{metadata}</div>
    </div>
  );
}

export { MessageCaption };
