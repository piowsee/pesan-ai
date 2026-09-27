import { WhatsAppText } from '../whatsapp-text';
import type { MessageRendererProps } from './types';

function TextMessage({ message }: MessageRendererProps) {
  return (
    <WhatsAppText
      content={message.content ?? ''}
      trailingSpacerClassName={
        message.direction === 'outgoing' ? 'w-[72px]' : 'w-[52px]'
      }
    />
  );
}

export { TextMessage };
