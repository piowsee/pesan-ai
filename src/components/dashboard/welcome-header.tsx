'use client';

import { authClient } from '@/lib/auth/auth-client';

export function WelcomeHeader() {
  const { data: session } = authClient.useSession();

  if (!session?.user) return null;

  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold tracking-tight">
        Welcome back, {session.user.name}!
      </h1>
      <p className="text-muted-foreground mt-2">
        Here is an overview of your WhatsApp Business Accounts and recent
        activity.
      </p>
    </div>
  );
}
