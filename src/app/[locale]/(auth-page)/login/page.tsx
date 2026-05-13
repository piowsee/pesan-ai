import { AuthCard } from '@/components/auth/auth-card';
import { loginCardCopy } from '@/components/auth/content';
import { LoginForm } from '@/components/auth/login/login-form';
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

  return buildLocalizedMetadata(locale, 'login');
}

export default async function LocalizedLoginPage({ params }: Props) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    notFound();
  }

  const copy = loginCardCopy[locale];

  return (
    <AuthCard
      locale={locale}
      title={copy.title}
      subtitle={copy.subtitle}
      FormComponent={LoginForm}
    />
  );
}
