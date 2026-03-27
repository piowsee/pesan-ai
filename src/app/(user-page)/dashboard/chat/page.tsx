import { ChatWorkspace } from '@/components/chat/chat-workspace';
import { Skeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';

function ChatPageFallback() {
  return (
    <div className="grid min-h-[72vh] gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
      <Skeleton className="h-[72vh] rounded-[30px]" />
      <Skeleton className="h-[72vh] rounded-[30px]" />
    </div>
  );
}

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{
    wabaId?: string;
    conversationId?: string;
    filter?: string;
    phoneNumberId?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense fallback={<ChatPageFallback />}>
      <ChatWorkspace initialSearchParams={resolvedSearchParams} />
    </Suspense>
  );
}
