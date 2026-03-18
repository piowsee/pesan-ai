import { SignOutButton } from '@/components/auth/sign-out-button';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Dashboard utama pesan.ai.',
};

export default async function DashboardPage() {
  return <SignOutButton />;
}
