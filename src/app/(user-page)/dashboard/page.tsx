import { QuickActions } from '@/components/dashboard/quick-actions';
import { WabaStatusCards } from '@/components/dashboard/waba-status-cards';
import { WelcomeHeader } from '@/components/dashboard/welcome-header';
import { requireUser } from '@/lib/auth/auth-page-helper';

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="max-w-6xl mx-auto w-full">
      <WelcomeHeader user={user} />
      <WabaStatusCards />
      <QuickActions />
    </div>
  );
}
