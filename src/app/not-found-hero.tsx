'use client';

import { Container } from '@/components/Container';
import { Button } from '@/components/ui/button';
import { HyperText } from '@/components/ui/hyper-text';
import { LightRays } from '@/components/ui/light-rays';
import { WordRotate } from '@/components/ui/word-rotate';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { useSyncExternalStore } from 'react';

type NotFoundHeroProps = {
  badge: string;
  title: string;
  description: string;
  homeLabel: string;
};

export function NotFoundHero({
  badge,
  title,
  description,
  homeLabel,
}: NotFoundHeroProps) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
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
        {mounted ? (
          <LightRays color="#475569" count={3} opacity={0.4} blur={20} />
        ) : null}
      </div>

      <div className="pointer-events-none absolute -left-24 top-18 size-72 rounded-full bg-brand/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-16 size-80 rounded-full bg-brand/20 blur-3xl" />

      <Container className="relative z-10">
        <section className="mx-auto max-w-4xl text-center">
          <Link href="/">
            {mounted ? (
              <HyperText
                className="cursor-pointer select-none text-8xl font-black tracking-tighter text-white sm:text-9xl"
                animateOnHover={true}
              >
                {badge}
              </HyperText>
            ) : (
              <h1 className="cursor-pointer select-none py-2 text-8xl font-black tracking-tighter text-white sm:text-9xl">
                {badge}
              </h1>
            )}
          </Link>

          {mounted ? (
            <WordRotate
              className="mt-4 text-3xl leading-tight font-bold tracking-tight text-white sm:text-4xl lg:text-4xl"
              words={[title, description]}
              duration={3000}
            />
          ) : (
            <p className="mt-4 text-3xl leading-tight font-bold tracking-tight text-white sm:text-4xl lg:text-4xl">
              {title}
            </p>
          )}

          <div className="mt-10 flex justify-center">
            <Button
              asChild
              size="lg"
              variant="brand"
              className="h-12 rounded-full px-8 text-base font-semibold"
            >
              <Link href="/">{homeLabel}</Link>
            </Button>
          </div>
        </section>
      </Container>
    </main>
  );
}
