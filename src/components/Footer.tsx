'use client';

import { GravityStarsBackground } from '@/components/animate-ui/components/backgrounds/gravity-stars';
import { getLocaleFromPathname, toLocalePath } from '@/lib/locale';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaWhatsapp } from 'react-icons/fa';

import { Container } from './Container';

const footerCopy = {
  id: {
    metaPartner: 'Official Meta Tech Partner',
    description:
      'Solusi AI WhatsApp untuk membalas pelanggan dengan ramah dan mengatur booking otomatis.',
    company: 'Perusahaan',
    about: 'Tentang Kami',
    login: 'Masuk',
    consultation: 'Konsultasi Sekarang',
    features: 'Fitur',
    featureOne: 'Satu Nomor Terintegrasi',
    featureTwo: 'WhatsApp AI Agent',
    featureThree: 'Booking Otomatis',
    legal: 'Legal',
    terms: 'Syarat Layanan',
    privacy: 'Kebijakan Privasi',
    rights: '© 2026 Pesan AI. Hak cipta dilindungi.',
  },
  en: {
    metaPartner: 'Official Meta Tech Partner',
    description:
      'AI-powered WhatsApp solution to reply to customers and automate booking workflows.',
    company: 'Company',
    about: 'About Us',
    login: 'Login',
    consultation: 'Book a Consultation',
    features: 'Features',
    featureOne: 'One Integrated Number',
    featureTwo: 'WhatsApp AI Agent',
    featureThree: 'Automated Booking',
    legal: 'Legal',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    rights: '© 2026 Pesan AI. All rights reserved.',
  },
} as const;

export function Footer() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const copy = footerCopy[locale];

  const homeHref = toLocalePath(locale, '/');
  const loginHref = toLocalePath(locale, '/login');
  const termsHref = toLocalePath(locale, '/terms');
  const privacyHref = toLocalePath(locale, '/privacy');

  return (
    <footer className="relative isolate overflow-hidden border-t border-brand/20 bg-background font-sans select-none">
      <div className="absolute inset-0 z-0 opacity-100">
        <GravityStarsBackground
          className="text-brand/45"
          glowIntensity={100}
          starsCount={300}
          starsOpacity={0.6}
        />
      </div>

      <Container className="relative z-10 pointer-events-none pt-12 sm:pt-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.42, ease: 'easeOut' }}
          className="flex justify-center"
        >
          <div className="inline-flex items-center gap-3 bg-background/40 px-5 py-3 text-brand backdrop-blur-sm sm:px-6">
            <Image
              src="/meta-logo.png"
              alt="Meta"
              width={28}
              height={28}
              className="size-11 object-contain"
            />
            <span className="text-base font-semibold sm:text-xl">
              {copy.metaPartner}
            </span>
          </div>
        </motion.div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_auto]">
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.48, delay: 0.08, ease: 'easeOut' }}
            className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-left"
          >
            <Link
              href={homeHref}
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
              {copy.description}
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
          </motion.div>

          {/* 3-column links: all left-aligned, evenly spaced */}
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.48, delay: 0.18, ease: 'easeOut' }}
            className="grid grid-cols-2 gap-x-10 gap-y-8 text-base sm:grid-cols-3 sm:gap-x-14 lg:flex lg:gap-20"
          >
            <div className="flex flex-col gap-3 text-brand/75">
              <p className="text-base font-medium text-brand">{copy.company}</p>
              <Link
                href={homeHref}
                className="pointer-events-auto transition-colors hover:text-brand"
              >
                {copy.about}
              </Link>
              <Link
                href={loginHref}
                className="pointer-events-auto transition-colors hover:text-brand"
              >
                {copy.login}
              </Link>
              <a
                href="https://wa.me/6285129646215"
                target="_blank"
                rel="noopener noreferrer"
                className="pointer-events-auto transition-colors hover:text-brand"
              >
                {copy.consultation}
              </a>
            </div>

            <div className="flex flex-col gap-3 text-brand/75">
              <p className="text-base font-medium text-brand">
                {copy.features}
              </p>
              <span>{copy.featureOne}</span>
              <span>{copy.featureTwo}</span>
              <span>{copy.featureThree}</span>
            </div>

            <div className="col-span-2 flex flex-col gap-3 text-brand/75 sm:col-span-1">
              <p className="text-base font-medium text-brand">{copy.legal}</p>
              <Link
                href={termsHref}
                className="pointer-events-auto transition-colors hover:text-brand"
              >
                {copy.terms}
              </Link>
              <Link
                href={privacyHref}
                className="pointer-events-auto transition-colors hover:text-brand"
              >
                {copy.privacy}
              </Link>
            </div>
          </motion.div>
        </div>

        <p className="mt-10 text-center text-sm text-brand/75">{copy.rights}</p>

        <p className="pointer-events-none mt-2 -mb-2 w-full bg-linear-to-b from-brand/30 to-transparent bg-clip-text text-center text-[clamp(5rem,20vw,18.5rem)] font-semibold leading-[0.9] tracking-tight text-transparent">
          pesan.ai
        </p>
      </Container>
    </footer>
  );
}
