import { AuthCard } from '@/components/auth/auth-card';
import { ContactUsForm } from '@/components/auth/contact-us/contact-us-form';
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

  return buildLocalizedMetadata(locale, 'contactUs');
}

export default async function LocalizedContactUsPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const t = await getTranslations('Auth.pages.contactUs');

  return (
    <AuthCard title={t('title')} subtitle={t('subtitle')} formKey="contact-us">
      <ContactUsForm />
    </AuthCard>
  );
}
