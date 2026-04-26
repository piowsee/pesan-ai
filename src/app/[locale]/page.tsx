import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { FAQSection } from '@/components/landing/faq';
import { Hero } from '@/components/landing/hero';
import { auth } from '@/lib/auth/auth';
import { isAppLocale } from '@/lib/locale';
import { buildLocalizedMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

type LocalePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildLocalizedMetadata(locale, 'home');
}

export default async function LocalizedHomePage({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    notFound();
  }

  const session = await auth.api.getSession({ headers: await headers() });

  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar locale={locale} />
      <main>
        <Hero locale={locale} />
        <FAQSection locale={locale} />
      </main>
      <Footer locale={locale} />
    </div>
  );
}
