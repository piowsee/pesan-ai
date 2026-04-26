'use client';

import { loginCardCopy } from '@/components/auth/content';
import { LoginForm } from '@/components/auth/login-form';
import type { AppLocale } from '@/lib/locale';

type Props = {
  locale: AppLocale;
};

export function LoginCard({ locale }: Props) {
  const copy = loginCardCopy[locale];

  return (
    <div className="relative z-10 w-full max-w-md xl:max-w-xl">
      <div className="mb-8 space-y-2.5">
        <h1 className="text-[32px] leading-tight font-bold tracking-tight text-foreground sm:text-[34px] text-center">
          {copy.title}
        </h1>
        <p className="text-center text-sm leading-6 text-muted-foreground mb-10">
          {copy.subtitle}
        </p>
      </div>
      <LoginForm locale={locale} />
    </div>
  );
}
