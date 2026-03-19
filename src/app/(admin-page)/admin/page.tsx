import { AdminDashboardCard } from '@/components/admin/admin-dashboard-card';
import { PageHeader } from '@/components/header';
import { requireAdmin } from '@/lib/auth/auth-page-helper';

export default async function AdminPage() {
  await requireAdmin();

  return (
    <main className="relative flex h-svh items-center justify-center overflow-hidden bg-muted/25 px-6 font-sans">
      <div className="pointer-events-none absolute -left-24 top-16 size-80 rounded-full bg-brand/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-12 size-96 rounded-full bg-brand/10 blur-3xl" />

      <PageHeader />

      <AdminDashboardCard />
    </main>
  );
}
