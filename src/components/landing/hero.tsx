'use client';

import { Container } from '@/components/Container';
import { Button } from '@/components/ui/button';
import { getLocaleFromPathname, toLocalePath } from '@/lib/locale';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const heroCopy = {
  id: {
    badge: 'AI Agent WhatsApp Custom #1 Sesuai Kebutuhan Bisnismu',
    titleLineOne: 'AI Balas Chat Otomatis,',
    titleLineTwo: 'Booking Tanpa Ribet',
    description:
      'AI WhatsApp Agent yang menjawab pelanggan dan mengatur booking secara otomatis 24/7.',
    consultation: 'Konsultasi Sekarang',
    login: 'Masuk',
    heroAlt: 'Latar suasana malam untuk hero section Pesan AI',
    demoAlt: 'Demo produk Pesan AI',
  },
  en: {
    badge: 'Custom #1 WhatsApp AI Agent for Your Business Needs',
    titleLineOne: 'AI Handles Your Replies,',
    titleLineTwo: 'Bookings Made Effortless',
    description:
      'A WhatsApp AI agent that replies to customers and schedules bookings automatically 24/7.',
    consultation: 'Book a Consultation',
    login: 'Login',
    heroAlt: 'Night atmosphere background for Pesan AI hero section',
    demoAlt: 'Pesan AI product demo',
  },
} as const;

export function Hero() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const copy = heroCopy[locale];

  return (
    <section className="bg-background font-sans">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/landing/hero.jpg"
            alt={copy.heroAlt}
            width={1440}
            height={2560}
            sizes="100vw"
            priority
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/30" />
        </div>

        <Container className="relative z-10 flex min-h-dvh flex-col items-center px-4 pt-30 pb-12 sm:px-8 lg:pb-20">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ y: 22, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.42, ease: 'easeOut' }}
              className="mb-4 flex justify-center sm:mb-5"
            >
              <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-2 text-[11px] font-medium leading-snug tracking-wide text-white/90 backdrop-blur-sm sm:px-4 sm:py-2 sm:text-sm">
                {copy.badge}
              </span>
            </motion.div>

            <motion.h1
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.08, ease: 'easeOut' }}
              className="text-2xl font-semibold leading-tight text-white sm:text-4xl md:text-5xl lg:text-[3.35rem]"
            >
              <span className="block">{copy.titleLineOne}</span>
              <span className="mt-2 block lg:whitespace-nowrap">
                {copy.titleLineTwo}
              </span>
            </motion.h1>

            <motion.p
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.48, delay: 0.18, ease: 'easeOut' }}
              className="mx-auto mt-4 max-w-4xl text-pretty text-sm leading-relaxed text-white/90 sm:mt-6 sm:text-base md:text-lg"
            >
              {copy.description}
            </motion.p>

            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.48, delay: 0.26, ease: 'easeOut' }}
              className="mx-auto mt-5 flex w-full max-w-md flex-col items-center gap-2.5 sm:mt-8 sm:max-w-none sm:flex-row sm:justify-center sm:gap-3"
            >
              <Button
                asChild
                size="lg"
                variant="brand"
                className="h-11 w-full rounded-md px-5 text-sm sm:h-12 sm:w-auto sm:rounded-full sm:px-7 sm:text-base"
              >
                <a
                  href="https://wa.me/6285129646215"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy.consultation}
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 w-full rounded-md border-white/70 bg-transparent px-5 text-sm text-white hover:bg-transparent hover:text-white/85 sm:h-12 sm:w-auto sm:rounded-full sm:px-7 sm:text-base"
              >
                <Link href={toLocalePath(locale, '/login')}>{copy.login}</Link>
              </Button>
            </motion.div>
          </div>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.34, ease: 'easeOut' }}
            className="mt-8 w-full max-w-5xl overflow-hidden rounded-xl border border-white/25 bg-black/15 shadow-[0_16px_48px_-30px_rgba(255,255,255,0.35)] sm:mt-15 sm:rounded-2xl xl:rounded-3xl"
          >
            <Image
              src="/landing/demo-hero.png"
              alt={copy.demoAlt}
              width={1919}
              height={1079}
              priority
              sizes="(max-width: 640px) 94vw, (max-width: 1024px) 90vw, 1100px"
              className="h-auto w-full"
            />
          </motion.div>
        </Container>
      </div>
    </section>
  );
}
