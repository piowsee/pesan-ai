'use client';

import { MetaTechPartner } from '@/components/auth/meta-tech-partner';
import { Link, usePathname } from '@/i18n/navigation';
import { Mail } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa';

export function AuthBrandPanel() {
  const t = useTranslations('Auth.brandPanel');
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const [isPanelVisible, setIsPanelVisible] = useState(true);

  const isContactPage = pathname.endsWith('/contact-us');
  const panelKey = isContactPage ? 'contact-us' : 'default';

  const transition = useMemo(
    () => ({
      opacity: prefersReducedMotion ? '0ms' : '100ms',
      filter: prefersReducedMotion ? '0ms' : '140ms',
    }),
    [prefersReducedMotion],
  );

  useEffect(() => {
    function handleLeave(event: Event) {
      const customEvent = event as CustomEvent<{ href?: string }>;
      const targetHref = customEvent.detail?.href;
      const targetIsContact = targetHref
        ? targetHref.endsWith('/contact-us')
        : false;

      if (targetIsContact !== isContactPage) {
        setIsPanelVisible(false);
      }
    }

    window.addEventListener('auth-panel-leave', handleLeave);

    return () => {
      window.removeEventListener('auth-panel-leave', handleLeave);
    };
  }, [isContactPage]);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      setIsPanelVisible(true);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [pathname]);

  return (
    <section className="relative hidden h-full overflow-hidden lg:flex">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/login/bg_login.webp')" }}
      />
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[10px]" />

      <div className="relative z-10 flex h-full w-full flex-col px-10 py-9 xl:px-12">
        <Link
          href="/"
          draggable={false}
          className="inline-flex w-fit select-none items-center gap-2"
        >
          <Image
            src="/pesan-ai-logo.png"
            alt="Pesan AI logo"
            width={120}
            height={28}
            className="h-10 w-auto object-contain"
            priority
            draggable={false}
          />
          <span
            className="mb-1 select-none text-xl font-bold tracking-tight text-white"
            draggable={false}
          >
            Pesan AI
          </span>
        </Link>

        <div
          key={panelKey}
          className="my-auto max-w-2xl space-y-6"
          style={{
            opacity: isPanelVisible ? 1 : 0,
            filter: isPanelVisible ? 'blur(0px)' : 'blur(12px)',
            transition: `opacity ${transition.opacity} cubic-bezier(0.22, 1, 0.36, 1), filter ${transition.filter} cubic-bezier(0.22, 1, 0.36, 1)`,
            willChange: prefersReducedMotion ? 'auto' : 'opacity, filter',
          }}
        >
          <p className="text-[38px] leading-[1.3] font-bold text-white">
            {isContactPage ? t('contactHeadline') : t('headline')}
          </p>
          <MetaTechPartner />
        </div>

        <div className="flex flex-col gap-3 text-sm text-white/80">
          <a
            href="mailto:poc.helpteam@gmail.com"
            className="inline-flex w-fit items-center gap-2 transition-colors hover:text-white cursor-pointer"
          >
            <Mail className="size-5" />
            <span>poc.helpteam@gmail.com</span>
          </a>
          <a
            href="https://wa.me/6285195563454"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-2 transition-colors hover:text-white cursor-pointer"
          >
            <FaWhatsapp className="size-5" />
            <span className="text-xs">+62 851 9556 3454</span>
          </a>
        </div>
      </div>
    </section>
  );
}
