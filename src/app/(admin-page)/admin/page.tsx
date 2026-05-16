import { AdminDashboardCard } from '@/components/admin/admin-dashboard-card';

export default async function AdminPage() {
  return (
    <div className="flex min-h-[calc(100svh-5rem)] items-center justify-center">
      <AdminDashboardCard />
    </div>
  );
}
