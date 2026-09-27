import { AuthBrandPanel } from '@/components/auth/auth-brand-panel';
import { AuthPanelShell } from '@/components/auth/auth-panel-shell';
import { routing } from '@/i18n/routing';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AuthPageLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <main className="relative h-svh overflow-hidden bg-muted/25 font-sans">
      <div className="pointer-events-none absolute -left-24 top-16 size-80 rounded-full bg-brand/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-12 size-96 rounded-full bg-brand/10 blur-3xl" />

      <div className="relative grid h-svh w-full lg:grid-cols-2">
        <AuthBrandPanel />

        <section className="relative h-full overflow-hidden border-border/70 bg-card/95 lg:border-l">
          <div className="flex h-full w-full items-center justify-center px-6 py-10 sm:px-10 lg:px-14 xl:px-20">
            <AuthPanelShell>{children}</AuthPanelShell>
          </div>
        </section>
      </div>
    </main>
  );
}
