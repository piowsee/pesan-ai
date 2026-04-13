import PrivacyPolicyPage from '@/app/(legal)/privacy/page';
import { isAppLocale } from '@/lib/locale';
import { buildLocalizedMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

type LocalePrivacyPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: LocalePrivacyPageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildLocalizedMetadata(locale, 'privacy');
}

export default async function LocalizedPrivacyPage({
  params,
}: LocalePrivacyPageProps) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    notFound();
  }

  return <PrivacyPolicyPage />;
}
