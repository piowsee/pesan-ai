import { AuthCard } from '@/components/auth/auth-card';
import { forgotPasswordCardCopy } from '@/components/auth/content';
import { ForgotPasswordForm } from '@/components/auth/forgot-password/forgot-password-form';
import { isAppLocale } from '@/lib/locale';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function LocalizedForgotPasswordPage({ params }: Props) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    notFound();
  }

  const copy = forgotPasswordCardCopy[locale];

  return (
    <AuthCard
      locale={locale}
      title={copy.title}
      subtitle={copy.subtitle}
      FormComponent={ForgotPasswordForm}
    />
  );
}
