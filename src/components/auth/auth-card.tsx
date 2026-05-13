'use client';

import type { AppLocale } from '@/lib/locale';
import { type ComponentType, Suspense } from 'react';

type AuthFormProps = {
  locale: AppLocale;
};

type Props = {
  locale: AppLocale;
  title: string;
  subtitle: string;
  FormComponent: ComponentType<AuthFormProps>;
};

export function AuthCard({ locale, title, subtitle, FormComponent }: Props) {
  return (
    <div className="relative z-10 w-full max-w-md xl:max-w-xl">
      <div className="mb-8 space-y-2.5">
        <h1 className="text-[32px] leading-tight font-bold tracking-tight text-foreground sm:text-[34px] text-center">
          {title}
        </h1>
        <p className="text-center text-sm leading-6 text-muted-foreground mb-10">
          {subtitle}
        </p>
      </div>
      <Suspense
        fallback={
          <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
        }
      >
        <FormComponent locale={locale} />
      </Suspense>
    </div>
  );
}
