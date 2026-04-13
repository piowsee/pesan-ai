import type { Metadata } from 'next';

import { type AppLocale, toLocalePath } from './locale';

type SeoPage = 'home' | 'login' | 'terms' | 'privacy';

type PageCopy = {
  title: string;
  description: string;
};

const PAGE_PATHS: Record<SeoPage, string> = {
  home: '/',
  login: '/login',
  terms: '/terms',
  privacy: '/privacy',
};

const PAGE_COPY: Record<SeoPage, Record<AppLocale, PageCopy>> = {
  home: {
    id: {
      title: 'pesan.ai | AI Agent WhatsApp untuk Bisnis',
      description:
        'Pesan AI membantu bisnis membalas chat pelanggan dan mengatur booking otomatis lewat WhatsApp dengan AI.',
    },
    en: {
      title: 'pesan.ai | WhatsApp AI Agent for Business',
      description:
        'Pesan AI helps businesses automate WhatsApp replies and booking workflows with intelligent AI agents.',
    },
  },
  login: {
    id: {
      title: 'Masuk | pesan.ai',
      description:
        'Masuk ke akun pesan.ai untuk mengelola otomatisasi chat WhatsApp bisnis Anda.',
    },
    en: {
      title: 'Login | pesan.ai',
      description:
        'Sign in to your pesan.ai account and manage WhatsApp AI chat automation for your business.',
    },
  },
  terms: {
    id: {
      title: 'Syarat Layanan | pesan.ai',
      description:
        'Baca Syarat Layanan pesan.ai untuk memahami ketentuan penggunaan platform dan layanan kami.',
    },
    en: {
      title: 'Terms of Service | pesan.ai',
      description:
        'Read the Terms of Service for pesan.ai to understand platform usage and legal obligations.',
    },
  },
  privacy: {
    id: {
      title: 'Kebijakan Privasi | pesan.ai',
      description:
        'Pelajari bagaimana pesan.ai mengumpulkan, menggunakan, dan melindungi data pribadi Anda.',
    },
    en: {
      title: 'Privacy Policy | pesan.ai',
      description:
        'Learn how pesan.ai collects, uses, and protects your personal data across our services.',
    },
  },
};

export function buildLocalizedMetadata(
  locale: AppLocale,
  page: SeoPage,
): Metadata {
  const currentPage = PAGE_COPY[page][locale];
  const pagePath = PAGE_PATHS[page];

  return {
    title: currentPage.title,
    description: currentPage.description,
    alternates: {
      canonical: toLocalePath(locale, pagePath),
      languages: {
        'id-ID': toLocalePath('id', pagePath),
        'en-US': toLocalePath('en', pagePath),
      },
    },
    openGraph: {
      title: currentPage.title,
      description: currentPage.description,
      type: 'website',
      locale: locale === 'id' ? 'id_ID' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: currentPage.title,
      description: currentPage.description,
    },
  };
}
