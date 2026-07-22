import { WabaDashboardManager } from '@/components/dashboard/business/connect-app/waba-dashboard-manager';

export default function WabaPage() {
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col px-4 pt-9 pb-6 sm:px-6 sm:pt-11 md:pt-12 md:pb-8">
      <WabaDashboardManager />
    </div>
  );
}
