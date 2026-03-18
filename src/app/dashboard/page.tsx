import { SignOutButton } from '@/components/auth/sign-out-button';
import { auth } from '@/lib/auth/auth';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Dashboard utama pesan.ai.',
};

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/login');
  }

  // const displayName = session.user.name || session.user.email;

  return <SignOutButton />;
}
