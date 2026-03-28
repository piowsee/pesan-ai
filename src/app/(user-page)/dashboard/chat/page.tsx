import { ChatWorkspace } from '@/components/chat/chat-workspace';
import { Skeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';

function ChatPageFallback() {
  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-background">
      <div className="grid h-full gap-0 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="border-r border-brand/20 p-4">
          <Skeleton className="h-full w-full rounded-2xl" />
        </div>
        <div className="p-4">
          <Skeleton className="h-full w-full rounded-2xl" />
        </div>
      </div>
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
