import { AuthCard } from '@/components/auth/auth-card';
import { RequestAccountForm } from '@/components/auth/request-account/request-account-form';
import { routing } from '@/i18n/routing';
import { buildLocalizedMetadata } from '@/lib/i18n-helper/seo';
import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  return buildLocalizedMetadata(locale, 'requestAccount');
}

export default async function LocalizedRequestAccountPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const t = await getTranslations('Auth.pages.requestAccount');

  return (
    <AuthCard
      title={t('title')}
      subtitle={t('subtitle')}
      FormComponent={RequestAccountForm}
    />
  );
}
