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
    <div className="mx-auto flex min-h-[calc(100svh-4.5rem)] w-full max-w-5xl items-start justify-center pt-12 sm:pt-16">
      <AdminDashboardCard />
    </div>
  );
}
