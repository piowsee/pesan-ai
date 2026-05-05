import { WabaDashboardManager } from '@/components/dashboard/waba/waba-dashboard-manager';

export default function WabaPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-6 pb-24 sm:px-6 md:pb-6">
      <WabaDashboardManager />
    </div>
  );
}
