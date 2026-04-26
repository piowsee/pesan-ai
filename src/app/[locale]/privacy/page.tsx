import { PrivacyMain } from '@/components/legal/privacy/privacy-main';
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

  return buildLocalizedMetadata(locale, 'privacy');
}

export default async function LocalizedPrivacyPage({ params }: Props) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    notFound();
  }

  return <PrivacyMain locale={locale} />;
}
