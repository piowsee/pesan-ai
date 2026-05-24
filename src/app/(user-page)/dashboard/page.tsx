import { QuickActions } from '@/components/dashboard/quick-actions';
import { WabaStatusCards } from '@/components/dashboard/waba-status-cards';
import { WelcomeHeader } from '@/components/dashboard/welcome-header';
import { requireUser } from '@/lib/auth/auth-page-helper';

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto h-full w-full max-w-5xl overflow-y-auto px-5 pt-10 pb-24 sm:px-8 sm:pt-12 md:pt-14 md:pb-10">
      <WelcomeHeader user={user} />
      <WabaStatusCards />
      <QuickActions />
    </div>
  );
}
