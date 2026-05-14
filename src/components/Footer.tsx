'use client';

import { ScrollReveal } from '@/components/ScrollReveal';
import { GravityStarsBackground } from '@/components/animate-ui/components/backgrounds/gravity-stars';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { FaWhatsapp } from 'react-icons/fa';

import { Container } from './Container';

export function Footer() {
  const t = useTranslations('Footer');
  const features = t.raw('featuresList') as string[];

  return (
    <footer className="relative isolate overflow-hidden border-t border-brand/20 bg-background font-sans select-none">
      <div className="absolute inset-0 z-0 opacity-100">
        <GravityStarsBackground
          className="text-brand/45"
          glowIntensity={10}
          starsCount={50}
          starsOpacity={0.5}
        />
      </div>

      <Container className="relative z-10 pointer-events-none pt-12 sm:pt-8">
        <ScrollReveal className="flex justify-center" distance={20}>
          <div className="inline-flex items-center gap-3 bg-background/40 px-5 py-3 text-brand backdrop-blur-sm sm:px-6">
            <Image
              src="/meta-logo.png"
              alt="Meta"
              width={28}
              height={28}
              className="size-11 object-contain"
            />
            <span className="text-base font-semibold sm:text-xl">
              {t('metaPartner')}
            </span>
          </div>
        </ScrollReveal>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_auto]">
          <ScrollReveal
            className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-left"
            delay={80}
            distance={22}
          >
            <Link
              href="/"
              className="-mt-2 inline-flex w-fit items-center gap-2 pointer-events-auto"
            >
              <Image
                src="/pesan-ai-black-logo.png"
                alt="Pesan AI"
                width={120}
                height={28}
                className="h-15 w-auto object-contain"
                draggable={false}
              />
              <p className="mb-1 text-3xl font-bold tracking-tight text-brand">
                pesan.ai
              </p>
            </Link>

            <p className="max-w-md text-base leading-relaxed text-brand/75">
              {t('description')}
            </p>

            <a
              href="https://wa.me/6285129646215"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-2 text-brand/75 pointer-events-auto transition-colors hover:text-brand"
            >
              <FaWhatsapp className="size-5" />
              <span className="text-base">WhatsApp</span>
            </a>
          </ScrollReveal>

          <ScrollReveal
            className="grid grid-cols-2 gap-x-10 gap-y-8 text-base sm:grid-cols-3 sm:gap-x-14 lg:flex lg:gap-20"
            delay={160}
            distance={22}
          >
            <div className="flex flex-col gap-3 text-brand/75">
              <p className="text-base font-medium text-brand">{t('company')}</p>
              <Link
                href="/"
                className="pointer-events-auto transition-colors hover:text-brand"
              >
                {t('about')}
              </Link>
              <Link
                href="/login"
                className="pointer-events-auto transition-colors hover:text-brand"
              >
                {t('login')}
              </Link>
              <a
                href="https://wa.me/6285129646215"
                target="_blank"
                rel="noopener noreferrer"
                className="pointer-events-auto transition-colors hover:text-brand"
              >
                {t('consultation')}
              </a>
            </div>

            <div className="flex flex-col gap-3 text-brand/75">
              <p className="text-base font-medium text-brand">
                {t('featuresTitle')}
              </p>
              {features.map((feature) => (
                <span key={feature}>{feature}</span>
              ))}
            </div>

            <div className="col-span-2 flex flex-col gap-3 text-brand/75 sm:col-span-1">
              <p className="text-base font-medium text-brand">
                {t('legalTitle')}
              </p>
              <Link
                href="/terms"
                className="pointer-events-auto transition-colors hover:text-brand"
              >
                {t('terms')}
              </Link>
              <Link
                href="/privacy"
                className="pointer-events-auto transition-colors hover:text-brand"
              >
                {t('privacy')}
              </Link>
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal className="mt-10" delay={220} distance={18}>
          <p className="text-center text-sm text-brand/75">{t('rights')}</p>
        </ScrollReveal>

        <ScrollReveal className="mt-2 -mb-2" delay={280} distance={18}>
          <p className="pointer-events-none w-full bg-linear-to-b from-brand/30 to-transparent bg-clip-text text-center text-[clamp(5rem,20vw,18.5rem)] font-semibold leading-[0.9] tracking-tight text-transparent">
            pesan.ai
          </p>
        </ScrollReveal>
      </Container>
    </footer>
  );
}
