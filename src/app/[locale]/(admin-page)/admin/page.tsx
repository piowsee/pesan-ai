import { AdminDashboardCard } from '@/components/admin/admin-dashboard-card';
import { setRequestLocale } from 'next-intl/server';

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="flex min-h-[calc(100svh-5rem)] items-center justify-center">
      <AdminDashboardCard />
    </div>
  );
}
