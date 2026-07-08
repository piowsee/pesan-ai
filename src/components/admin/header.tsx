import { SignOutButton } from '@/components/sign-out-button';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

export function PageHeader() {
  const t = useTranslations('Admin.Header');
  return (
    <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-white/10 bg-primary px-6 py-3 backdrop-blur-md sm:px-10">
      <div className="flex items-center gap-2">
        <Image
          src="/pesan-ai-logo.png"
          alt={t('logoAlt')}
          width={96}
          height={22}
          className="h-8 w-auto object-contain brightness-0 invert"
        />
        <span className="text-sm font-semibold tracking-tight text-primary-foreground">
          {t('brandName')}
        </span>
      </div>

      <SignOutButton />
    </header>
  );
}
