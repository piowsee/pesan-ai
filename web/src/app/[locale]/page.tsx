import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { FAQSection } from '@/components/landing/faq';
import { Hero } from '@/components/landing/hero';
import { routing } from '@/i18n/routing';
import { buildLocalizedMetadata } from '@/lib/i18n-helper/seo';
import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

type LocalePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  return buildLocalizedMetadata(locale, 'home');
}

export default async function LocalizedHomePage({ params }: LocalePageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar />
      <main>
        <Hero />
        <FAQSection />
      </main>
      <Footer />
    </div>
  );
}
