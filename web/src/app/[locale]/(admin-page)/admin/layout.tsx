import { PageHeader } from '@/components/admin/header';
import { routing } from '@/i18n/routing';
import { AuthPageHelper } from '@/lib/auth/auth-page-helper';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ReactNode } from 'react';

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  await AuthPageHelper.requireAdmin();

  return (
    <main className="relative min-h-svh bg-background px-5 pt-18 font-sans sm:px-6">
      <PageHeader />

      <div className="relative">{children}</div>
    </main>
  );
}
