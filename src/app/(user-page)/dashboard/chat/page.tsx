import {
  ChatWorkspace,
  ChatWorkspaceSkeleton,
} from '@/components/chat/chat-workspace';
import { Suspense } from 'react';

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatWorkspaceSkeleton />}>
      <ChatWorkspace />
    </Suspense>
  );
}
