import { QuickActions } from '@/components/dashboard/quick-actions';
import { WabaStatusCards } from '@/components/dashboard/waba-status-cards';
import { WelcomeHeader } from '@/components/dashboard/welcome-header';
import { requireUser } from '@/lib/auth/auth-page-helper';

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="h-full overflow-y-auto w-full">
      <div className="max-w-6xl mx-auto w-full p-4 md:p-6 lg:p-8">
        <WelcomeHeader user={user} />
        <WabaStatusCards />
        <QuickActions />
      </div>
    </div>
  );
}
