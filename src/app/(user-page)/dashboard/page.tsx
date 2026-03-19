import { SignOutButton } from '@/components/sign-out-button';
import { requireUser } from '@/lib/auth/auth-page-helper';

export default async function DashboardPage() {
  await requireUser();

  return <SignOutButton />;
}
