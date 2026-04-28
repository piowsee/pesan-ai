import { QuickActions } from '@/components/dashboard/quick-actions';
import { WabaStatusCards } from '@/components/dashboard/waba-status-cards';
import { WelcomeHeader } from '@/components/dashboard/welcome-header';
import { requireUser } from '@/lib/auth/auth-page-helper';

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-24 sm:px-6 md:pb-6">
      <WelcomeHeader user={user} />
      <WabaStatusCards />
      <QuickActions />
    </div>
  );
}
