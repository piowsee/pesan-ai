'use client';

import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth/auth-client';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type LoginButtonProps = {
  email: string;
  password: string;
  onError: (message: string) => void;
  onBeforeLogin?: () => boolean;
};

export function LoginButton({
  email,
  password,
  onError,
  onBeforeLogin,
}: LoginButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleLogin() {
    if (onBeforeLogin && !onBeforeLogin()) return;

    setIsPending(true);

    try {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
        rememberMe: true,
      });

      if (result?.error) {
        onError(result.error.message || 'Invalid email or password.');
        return;
      }

      const session = await authClient.getSession();
      const isAdmin = session?.data?.user?.role === 'admin';

      const redirectTo = isAdmin ? '/admin' : '/dashboard';
      router.push(redirectTo);
      router.refresh();
    } catch {
      onError('An error occurred during login. Please try again.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="brand"
      size="lg"
      disabled={isPending}
      onClick={handleLogin}
      className="mt-2 h-10 w-full rounded-md shadow-sm"
    >
      {isPending ? (
        <Loader2 className="animate-spin" data-icon="inline-start" />
      ) : null}
      {isPending ? 'Processing...' : 'Login'}
    </Button>
  );
}
