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
    <main className="relative min-h-svh overflow-hidden bg-muted/25 px-6 pt-20 font-sans">
      <div className="pointer-events-none absolute -left-24 top-16 size-80 rounded-full bg-brand/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-12 size-96 rounded-full bg-brand/10 blur-3xl" />

      <PageHeader />

      <div className="relative">{children}</div>
    </main>
  );
}
