'use client';

import { LoginForm } from '@/components/auth/login-form';
import { getLocaleFromPathname } from '@/lib/locale';
import { usePathname } from 'next/navigation';

const loginCardCopy = {
  id: {
    title: 'Masuk ke Akun Anda',
    subtitle: 'Masukkan email dan kata sandi Anda.',
  },
  en: {
    title: 'Login to Your Account',
    subtitle: 'Enter your email and password.',
  },
} as const;

export function LoginCard() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
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
      <LoginForm />
    </div>
  );
}
