import { getPathname } from '@/i18n/navigation';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { type AppLocale } from './locale';

type SeoPage = 'home' | 'login' | 'contactUs' | 'terms' | 'privacy';

const PAGE_PATHS: Record<SeoPage, string> = {
  home: '/',
  login: '/login',
  contactUs: '/contact-us',
  terms: '/terms',
  privacy: '/privacy',
};

export async function buildLocalizedMetadata(
  locale: AppLocale,
  page: SeoPage,
): Promise<Metadata> {
  const t = await getTranslations({
    locale,
    namespace: `Metadata.${page}`,
  });
  const pagePath = PAGE_PATHS[page];
  const title = t('title');
  const description = t('description');

  return {
    title,
    description,
    alternates: {
      canonical: getPathname({ href: pagePath, locale }),
      languages: {
        'id-ID': getPathname({ href: pagePath, locale: 'id' }),
        'en-US': getPathname({ href: pagePath, locale: 'en' }),
      },
    },
    openGraph: {
      title,
      description,
      type: 'website',
      locale: locale === 'id' ? 'id_ID' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}
