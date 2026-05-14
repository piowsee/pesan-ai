import { AuthCard } from '@/components/auth/auth-card';
import { ForgotPasswordForm } from '@/components/auth/forgot-password/forgot-password-form';
import { routing } from '@/i18n/routing';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function LocalizedForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const t = await getTranslations('Auth.pages.forgotPassword');

  return (
    <AuthCard
      title={t('title')}
      subtitle={t('subtitle')}
      FormComponent={ForgotPasswordForm}
    />
  );
}
