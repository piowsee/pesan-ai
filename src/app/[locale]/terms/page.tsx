import TermsOfServicePage from '@/app/(legal)/terms/page';
import { isAppLocale } from '@/lib/locale';
import { buildLocalizedMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

type LocaleTermsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: LocaleTermsPageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildLocalizedMetadata(locale, 'terms');
}

export default async function LocalizedTermsPage({
  params,
}: LocaleTermsPageProps) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    notFound();
  }

  return <TermsOfServicePage />;
}
