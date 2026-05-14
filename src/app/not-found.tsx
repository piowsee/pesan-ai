'use client';

import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { routing } from '@/i18n/routing';
import { NextIntlClientProvider } from 'next-intl';
import { usePathname } from 'next/navigation';

import enMessages from '../../messages/en.json';
import idMessages from '../../messages/id.json';
import { NotFoundHero } from '../components/not-found-hero';

type AppLocale = (typeof routing.locales)[number];

function resolveLocaleFromPathname(pathname: string | null): AppLocale {
  const firstSegment = pathname?.split('/')[1];

  return routing.locales.includes(firstSegment as AppLocale)
    ? (firstSegment as AppLocale)
    : routing.defaultLocale;
}

export default function NotFound() {
  const pathname = usePathname();
  const locale = resolveLocaleFromPathname(pathname);
  const messages = locale === 'id' ? idMessages : enMessages;
  const t = messages.NotFoundPage;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="bg-background font-sans">
        <Navbar />
        <NotFoundHero
          badge={t.badge}
          title={t.title}
          description={t.description}
          homeLabel={t.home}
        />
        <Footer />
      </div>
    </NextIntlClientProvider>
  );
}
