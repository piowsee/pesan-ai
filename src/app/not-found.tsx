'use client';

import { Container } from '@/components/Container';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import {
  type AppLocale,
  DEFAULT_LOCALE,
  isAppLocale,
  toLocalePath,
} from '@/lib/locale';
import { ArrowRight, Home, LogIn } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const notFoundCopy = {
  id: {
    badge: '404 - Halaman Tidak Ditemukan',
    title: 'Ups, halaman yang kamu cari tidak tersedia.',
    description:
      'Link mungkin sudah dipindahkan atau tidak pernah ada. Kamu bisa kembali ke beranda, login ke akunmu, atau konsultasi langsung via WhatsApp.',
    home: 'Kembali ke Beranda',
    login: 'Masuk ke Dashboard',
    consult: 'Konsultasi Sekarang',
  },
  en: {
    badge: '404 - Page Not Found',
    title: "We couldn't find the page you were looking for.",
    description:
      'The link may have moved or never existed. You can return home, sign in to your account, or contact us directly via WhatsApp.',
    home: 'Back to Home',
    login: 'Login to Dashboard',
    consult: 'Book a Consultation',
  },
} as const;

function getLocaleFromPathname(pathname: string): AppLocale {
  const firstSegment = pathname.split('/')[1] ?? '';
  return isAppLocale(firstSegment) ? firstSegment : DEFAULT_LOCALE;
}

export default function LocalizedNotFound() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const copy = notFoundCopy[locale];

  return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar locale={locale} />

      <main className="relative isolate overflow-hidden pt-18">
        <div className="absolute inset-0">
          <Image
            src="/landing/hero.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/58" />
        </div>

        <div className="pointer-events-none absolute -left-24 top-18 size-72 rounded-full bg-brand/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-16 size-80 rounded-full bg-brand/20 blur-3xl" />

        <Container className="relative z-10 py-16 sm:py-20 lg:py-24">
          <section className="mx-auto max-w-4xl border border-white/20 bg-background/90 p-6 shadow-[0_28px_80px_-42px_rgba(0,0,0,0.65)] backdrop-blur-sm sm:p-10 lg:p-12">
            <p className="inline-flex items-center border border-brand/20 bg-brand/8 px-3 py-2 text-xs font-semibold tracking-wide text-brand uppercase sm:text-sm">
              {copy.badge}
            </p>

            <h1 className="mt-5 text-3xl leading-tight font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {copy.title}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {copy.description}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                asChild
                size="lg"
                variant="brand"
                className="h-11 rounded-full px-6"
              >
                <Link href={toLocalePath(locale, '/')}>
                  <Home className="size-4" />
                  {copy.home}
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 rounded-full border-brand/30 bg-background/85 px-6 text-brand hover:bg-brand/8"
              >
                <Link href={toLocalePath(locale, '/login')}>
                  <LogIn className="size-4" />
                  {copy.login}
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="ghost"
                className="h-11 rounded-full px-6 text-brand hover:bg-brand/8"
              >
                <a
                  href="https://wa.me/6285129646215"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy.consult}
                  <ArrowRight className="size-4" />
                </a>
              </Button>
            </div>
          </section>
        </Container>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
