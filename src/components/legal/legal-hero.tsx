import { getDateLocale } from '@/lib/locale';
import type { AppLocale } from '@/lib/locale';
import Image from 'next/image';

type Props = {
  locale: AppLocale;
  title: string;
  heroAlt: string;
  updatedLabel: string;
};

export function LegalHero({ locale, title, heroAlt, updatedLabel }: Props) {
  return (
    <section className="relative -mt-22 h-100 w-full overflow-hidden">
      <Image
        src="/landing/hero.jpg"
        alt={heroAlt}
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="absolute inset-0 bg-black/30" />

      <div className="relative z-10 flex h-full flex-col items-center justify-end px-6 pb-24 pt-32 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
          {title}
        </h1>

        <p className="mt-4 text-lg text-white/80">
          {updatedLabel}:{' '}
          {new Date().toLocaleDateString(getDateLocale(locale), {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>
    </section>
  );
}
