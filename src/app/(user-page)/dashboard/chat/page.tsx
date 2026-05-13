import { ChatWorkspace } from '@/components/chat/chat-workspace';
import { Suspense } from 'react';

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatWorkspace />
    </Suspense>
  );
}
