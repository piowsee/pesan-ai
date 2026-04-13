'use client';

import { GravityStarsBackground } from '@/components/animate-ui/components/backgrounds/gravity-stars';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { FaWhatsapp } from 'react-icons/fa';

import { Container } from './Container';

export function Footer() {
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
              Official Meta Tech Partner
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
              href="/"
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
              Solusi AI WhatsApp untuk membalas pelanggan dengan ramah dan
              mengatur booking otomatis.
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
              <p className="text-base font-medium text-brand">Company</p>
              <Link
                href="/"
                className="pointer-events-auto transition-colors hover:text-brand"
              >
                Tentang Kami
              </Link>
              <Link
                href="/login"
                className="pointer-events-auto transition-colors hover:text-brand"
              >
                Masuk
              </Link>
              <a
                href="https://wa.me/6285129646215"
                target="_blank"
                rel="noopener noreferrer"
                className="pointer-events-auto transition-colors hover:text-brand"
              >
                Konsultasi Sekarang
              </a>
            </div>

            <div className="flex flex-col gap-3 text-brand/75">
              <p className="text-base font-medium text-brand">Fitur</p>
              <span>Satu Nomor Terintegrasi</span>
              <span>Whatsapp AI Agent</span>
              <span>Booking Otomatis</span>
            </div>

            <div className="col-span-2 flex flex-col gap-3 text-brand/75 sm:col-span-1">
              <p className="text-base font-medium text-brand">Legal</p>
              <Link
                href="/terms"
                className="pointer-events-auto transition-colors hover:text-brand"
              >
                Terms
              </Link>
              <Link
                href="/privacy"
                className="pointer-events-auto transition-colors hover:text-brand"
              >
                Privacy
              </Link>
            </div>
          </motion.div>
        </div>

        <p className="mt-10 text-center text-sm text-brand/75">
          © 2026 Pesan AI. All rights reserved.
        </p>

        <p className="pointer-events-none mt-2 -mb-2 w-full bg-linear-to-b from-brand/30 to-transparent bg-clip-text text-center text-[clamp(5rem,20vw,18.5rem)] font-semibold leading-[0.9] tracking-tight text-transparent">
          pesan.ai
        </p>
      </Container>
    </footer>
  );
}
