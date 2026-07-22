import { redirect } from '@/i18n/navigation';

type DashboardIndexPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardIndexPage({
  params,
}: DashboardIndexPageProps) {
  const { locale } = await params;
  redirect({ href: '/dashboard/chat', locale });
}
