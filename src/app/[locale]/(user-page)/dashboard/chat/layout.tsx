import {
  ChatWorkspace,
  ChatWorkspaceSkeleton,
} from '@/components/dashboard/chat/workspace';
import { type ReactNode, Suspense } from 'react';

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={<ChatWorkspaceSkeleton />}>
        <ChatWorkspace />
      </Suspense>
      {children}
    </>
  );
}
