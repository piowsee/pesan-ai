import { SignOutButton } from '@/components/auth/sign-out-button';
import { requireUser } from '@/lib/auth/auth-page-helper';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Dashboard utama pesan.ai.',
};

export default async function DashboardPage() {
  await requireUser();

  return <SignOutButton />;
}
