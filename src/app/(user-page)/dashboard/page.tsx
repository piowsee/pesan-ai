import { QuickActions } from '@/components/dashboard/quick-actions';
import { WabaStatusCards } from '@/components/dashboard/waba-status-cards';
import { WelcomeHeader } from '@/components/dashboard/welcome-header';
import { requireUser } from '@/lib/auth/auth-page-helper';

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto h-full w-full max-w-6xl overflow-y-auto px-4 pt-9 pb-24 sm:px-6 sm:pt-11 md:pt-12 md:pb-10">
      <WelcomeHeader user={user} />
      <WabaStatusCards />
      <QuickActions />
    </div>
  );
}
