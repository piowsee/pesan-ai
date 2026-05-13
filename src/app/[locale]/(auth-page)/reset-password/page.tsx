import { AuthCard } from '@/components/auth/auth-card';
import { resetPasswordCardCopy } from '@/components/auth/content';
import { ResetPasswordForm } from '@/components/auth/reset-password/reset-password-form';
import { isAppLocale } from '@/lib/locale';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function LocalizedResetPasswordPage({ params }: Props) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    notFound();
  }

  const copy = resetPasswordCardCopy[locale];

  return (
    <AuthCard
      locale={locale}
      title={copy.title}
      subtitle={copy.subtitle}
      FormComponent={ResetPasswordForm}
    />
  );
}
