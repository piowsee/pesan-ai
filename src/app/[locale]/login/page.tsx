import { LoginBrandPanel } from '@/components/auth/login-brand-panel';
import { LoginCard } from '@/components/auth/login-card';
import { isAppLocale } from '@/lib/locale';
import { buildLocalizedMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildLocalizedMetadata(locale, 'login');
}

export default async function LocalizedLoginPage({ params }: Props) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    notFound();
  }

  return (
    <main className="relative min-h-svh overflow-hidden bg-muted/25 font-sans">
      <div className="pointer-events-none absolute -left-24 top-16 size-80 rounded-full bg-brand/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-12 size-96 rounded-full bg-brand/10 blur-3xl" />

      <div className="relative grid min-h-svh w-full lg:grid-cols-2">
        <LoginBrandPanel locale={locale} />

        <section className="relative flex min-h-svh items-center justify-center border-border/70 bg-card/95 px-6 py-10 sm:px-10 lg:border-l lg:px-14 xl:px-20">
          <LoginCard locale={locale} />
        </section>
      </div>
    </main>
  );
}
