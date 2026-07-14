import { AuthCard } from '@/components/auth/auth-card';
import { LoginForm } from '@/components/auth/login/login-form';
import { routing } from '@/i18n/routing';
import { auth } from '@/lib/auth/auth';
import { buildLocalizedMetadata } from '@/lib/i18n-helper/seo';
import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ session_expired?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  return buildLocalizedMetadata(locale, 'login');
}

export default async function LocalizedLoginPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const query = await searchParams;
  const isExpiredSessionReturn = query?.session_expired === 'true';

  if (!isExpiredSessionReturn) {
    const session = await auth.api.getSession({
      headers: await headers(),
      query: {
        disableCookieCache: true,
        disableRefresh: true,
      },
    });

    if (session?.user) {
      redirect(
        session.user.role === 'admin'
          ? `/${locale}/admin`
          : `/${locale}/dashboard`,
      );
    }
  }

  const t = await getTranslations('Auth.pages.login');

  return (
    <AuthCard title={t('title')} subtitle={t('subtitle')} formKey="login">
      <LoginForm />
    </AuthCard>
  );
}
