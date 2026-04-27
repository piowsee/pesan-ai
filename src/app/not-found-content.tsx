'use client';

import { Container } from '@/components/Container';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { HyperText } from '@/components/ui/hyper-text';
import { LightRays } from '@/components/ui/light-rays';
import { WordRotate } from '@/components/ui/word-rotate';
import {
  type AppLocale,
  DEFAULT_LOCALE,
  isAppLocale,
  toLocalePath,
} from '@/lib/locale';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const notFoundCopy = {
  id: {
    badge: '404',
    title: 'Ups, halaman yang kamu cari tidak tersedia.',
    description: 'Link mungkin dipindahkan atau tidak pernah ada.',
    home: 'Kembali ke Beranda',
  },
  en: {
    badge: '404',
    title: "We couldn't find the page you were looking for.",
    description: 'The link may have moved or never existed.',
    home: 'Back to Home',
  },
} as const;

function getLocaleFromPathname(pathname: string): AppLocale {
  const firstSegment = pathname.split('/')[1] ?? '';
  return isAppLocale(firstSegment) ? firstSegment : DEFAULT_LOCALE;
}

export default function NotFoundContent() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const copy = notFoundCopy[locale];

  return (
    <div className="bg-background font-sans">
      <Navbar locale={locale} />

      <main className="relative flex h-screen items-center justify-center isolate overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/landing/hero.jpg"
            alt=""
            fill
            priority
            sizes="1000vw"
            className="object-cover object-bottom"
          />
          <div className="absolute inset-0 bg-black/50" />
          <LightRays color="#475569" count={3} opacity={0.4} blur={20} />
        </div>

        <div className="pointer-events-none absolute -left-24 top-18 size-72 rounded-full bg-brand/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-16 size-80 rounded-full bg-brand/20 blur-3xl" />

        <Container className="relative z-10">
          <section className="mx-auto max-w-4xl text-center">
            <Link href={toLocalePath(locale, '/')}>
              <HyperText
                className="cursor-pointer select-none text-8xl font-black tracking-tighter text-white sm:text-9xl"
                animateOnHover={true}
              >
                {copy.badge}
              </HyperText>
            </Link>

            <WordRotate
              className="mt-4 text-3xl leading-tight font-bold tracking-tight text-white sm:text-4xl lg:text-4xl"
              words={[copy.title, copy.description]}
              duration={3000}
            />

            <div className="mt-10 flex justify-center">
              <Button
                asChild
                size="lg"
                variant="brand"
                className="h-12 rounded-full px-8 text-base font-semibold"
              >
                <Link href={toLocalePath(locale, '/')}>{copy.home}</Link>
              </Button>
            </div>
          </section>
        </Container>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
