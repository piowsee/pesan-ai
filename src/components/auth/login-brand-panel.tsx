'use client';

import { MetaTechPartner } from '@/components/auth/meta-tech-partner';
import { getLocaleFromPathname } from '@/lib/locale';
import { Mail } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaWhatsapp } from 'react-icons/fa';

const loginBrandPanelCopy = {
  id: {
    headline:
      'Tingkatkan efisiensi bisnis melalui otomatisasi chat WhatsApp dengan dukungan AI.',
  },
  en: {
    headline:
      'Boost your business efficiency through WhatsApp chat automation with AI support.',
  },
} as const;

export function LoginBrandPanel() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const copy = loginBrandPanelCopy[locale];

  return (
    <section className="relative hidden min-h-svh overflow-hidden lg:flex">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/login/bg_login.webp')" }}
      />
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[10px]" />

      <div className="relative z-10 flex h-full w-full flex-col px-10 py-9 xl:px-12">
        <div className="flex items-center gap-2">
          <Image
            src="/pesan-ai-logo.png"
            alt="pesan.ai logo"
            width={120}
            height={28}
            className="h-10 w-auto object-contain"
            priority
          />
          <span className="text-xl font-bold tracking-tight text-white mb-1">
            pesan.ai
          </span>
        </div>

        <div className="my-auto max-w-2xl space-y-6">
          <p className="text-[38px] leading-[1.3] font-bold text-white">
            {copy.headline}
          </p>
          <MetaTechPartner />
        </div>

        <div className="flex flex-col gap-3 text-sm text-white/80">
          <Link
            href="mailto:poc.helpteam@gmail.com"
            className="inline-flex w-fit items-center gap-2 transition-colors hover:text-white cursor-pointer"
          >
            <Mail className="size-5" />
            <span>poc.helpteam@gmail.com</span>
          </Link>
          <Link
            href="https://wa.me/6285195563454"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-2 transition-colors hover:text-white cursor-pointer"
          >
            <FaWhatsapp className="size-5" />
            <span className="text-xs">+62 851 9556 3454</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
