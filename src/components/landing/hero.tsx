'use client';

import { Container } from '@/components/Container';
import { ScrollReveal } from '@/components/ScrollReveal';
import { Button } from '@/components/ui/button';
import { Highlighter } from '@/components/ui/highlighter';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { Meteors } from '@/components/ui/meteors';
import { getLocaleFromPathname, toLocalePath } from '@/lib/locale';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

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
  const consultationHref = 'https://wa.me/6285129646215';
  const [descriptionStart, descriptionEnd = ''] =
    copy.description.split('24/7');
  const [showOtomatisHighlight, setShowOtomatisHighlight] = useState(false);
  const [show247Highlight, setShow247Highlight] = useState(false);

  useEffect(() => {
    if (!showOtomatisHighlight) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setShow247Highlight(true);
    }, 700);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [showOtomatisHighlight]);

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
          <div className="pointer-events-none absolute inset-0 overflow-hidden mask-[linear-gradient(to_bottom,white,white,transparent_92%)]">
            <Meteors
              number={18}
              minDelay={0.5}
              maxDelay={2}
              minDuration={4}
              maxDuration={9}
              angle={215}
              className="bg-white/80 opacity-70 shadow-[0_0_0_1px_#ffffff60] [&>div]:from-white/75"
            />
          </div>
          <div className="absolute inset-0 bg-black/20" />
        </div>

        <Container className="relative z-10 flex min-h-dvh flex-col items-center px-4 pt-30 pb-12 sm:px-8 lg:pb-20">
          <div className="mx-auto max-w-4xl text-center">
            <ScrollReveal
              className="mb-4 flex justify-center sm:mb-5"
              distance={22}
            >
              <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-2 text-[11px] font-medium leading-snug tracking-wide text-white/90 backdrop-blur-sm sm:px-4 sm:py-2 sm:text-sm">
                {copy.badge}
              </span>
            </ScrollReveal>

            <ScrollReveal
              className="text-2xl font-semibold leading-tight text-white sm:text-4xl md:text-5xl lg:text-[3.35rem]"
              delay={80}
              distance={24}
              onRevealComplete={() => {
                setShowOtomatisHighlight(true);
              }}
            >
              <h1>
                <span className="block">
                  {locale === 'id' ? (
                    <>
                      AI Balas Chat{' '}
                      {showOtomatisHighlight ? (
                        <Highlighter
                          action="underline"
                          color="#ffffff"
                          strokeWidth={2.2}
                          animationDuration={700}
                          iterations={4}
                        >
                          Otomatis
                        </Highlighter>
                      ) : (
                        'Otomatis'
                      )}
                      ,
                    </>
                  ) : locale === 'en' ? (
                    <>
                      AI Handles Your{' '}
                      {showOtomatisHighlight ? (
                        <Highlighter
                          action="underline"
                          color="#ffffff"
                          strokeWidth={2.2}
                          animationDuration={700}
                          iterations={4}
                        >
                          Replies
                        </Highlighter>
                      ) : (
                        'Replies'
                      )}
                      ,
                    </>
                  ) : (
                    copy.titleLineOne
                  )}
                </span>
                <span className="mt-2 block lg:whitespace-nowrap">
                  {copy.titleLineTwo}
                </span>
              </h1>
            </ScrollReveal>

            <ScrollReveal
              className="mx-auto mt-4 max-w-4xl text-pretty text-sm leading-relaxed text-white/90 sm:mt-6 sm:text-base md:text-lg"
              delay={180}
              distance={24}
            >
              <p>
                {descriptionStart}
                {show247Highlight ? (
                  <Highlighter
                    action="highlight"
                    color="#475569"
                    strokeWidth={2}
                    animationDuration={700}
                    iterations={1}
                  >
                    24/7
                  </Highlighter>
                ) : (
                  '24/7'
                )}
                {descriptionEnd}
              </p>
            </ScrollReveal>

            <ScrollReveal
              className="mx-auto mt-5 flex w-full max-w-md flex-col items-center gap-2.5 sm:mt-8 sm:max-w-none sm:flex-row sm:justify-center sm:gap-3"
              delay={260}
              distance={24}
            >
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 w-full rounded-md border-white/70 bg-transparent px-8 text-sm text-white hover:bg-transparent hover:text-white/85 sm:h-12 sm:w-auto sm:rounded-full sm:px-10 sm:text-base"
              >
                <Link href={toLocalePath(locale, '/login')}>{copy.login}</Link>
              </Button>
              <InteractiveHoverButton
                type="button"
                className="h-11 w-full rounded-md border-0 bg-white px-5 text-sm text-zinc-900 sm:h-12 sm:w-auto sm:rounded-full sm:px-7 sm:text-base"
                onClick={() => {
                  window.open(
                    consultationHref,
                    '_blank',
                    'noopener,noreferrer',
                  );
                }}
              >
                {copy.consultation}
              </InteractiveHoverButton>
            </ScrollReveal>
          </div>

          <ScrollReveal
            className="mt-8 w-full max-w-5xl overflow-hidden rounded-xl border border-white/25 bg-black/15 shadow-[0_16px_48px_-30px_rgba(255,255,255,0.35)] sm:mt-15 sm:rounded-2xl xl:rounded-3xl"
            delay={340}
            distance={30}
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
          </ScrollReveal>
        </Container>
      </div>
    </section>
  );
}
