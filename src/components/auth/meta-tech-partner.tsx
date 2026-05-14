import { useTranslations } from 'next-intl';
import Image from 'next/image';

export function MetaTechPartner() {
  const t = useTranslations('Common');

  return (
    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs text-white/90 backdrop-blur-xl">
      <Image
        src="/meta-logo.png"
        alt="Meta logo"
        width={22}
        height={22}
        className="h-5.5 w-5.5 object-contain"
      />
      <span className="text-sm">{t('metaTechPartner')}</span>
    </div>
  );
}
