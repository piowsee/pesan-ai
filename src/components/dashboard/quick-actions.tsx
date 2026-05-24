'use client';

import { cn } from '@/lib/utils';
import { ArrowUpRight, Building2, MessageSquare } from 'lucide-react';
import Link from 'next/link';

const actions = [
  {
    eyebrow: 'Inbox',
    title: 'Balas percakapan pelanggan',
    href: '/dashboard/chat',
    icon: MessageSquare,
    helper:
      'Buka panel Inbox untuk memantau antrean percakapan, menugaskan agen, dan merespons pesan secara real-time.',
    iconColor: 'text-brand/50',
  },
  {
    eyebrow: 'WABA',
    title: 'Kelola akun WhatsApp Business',
    href: '/dashboard/waba',
    icon: Building2,
    helper:
      'Masuk ke pengaturan WABA untuk mengelola status nomor, verifikasi Meta, dan limitasi tiering pengiriman pesan.',
    iconColor: 'text-[oklch(0.52_0.12_190)]',
  },
];

export function QuickActions() {
  return (
    <section className="mb-8">
      {/* Section label */}
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-brand/80">
          Lanjutkan pekerjaan
        </h2>
      </div>

      {/* Action tiles */}
      <div className="grid gap-5 sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className="group flex flex-col justify-between rounded-sm border border-brand/8 bg-brand/5 px-5 py-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            {/* Top row: icon + info */}
            <div className="mb-6 flex items-start justify-between">
              <action.icon className={cn('size-6', action.iconColor)} />
            </div>

            {/* Bottom: label + title + arrow */}
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand/60">
                  {action.eyebrow}
                </p>
                <h3 className="max-w-xs text-lg font-semibold leading-snug text-brand">
                  {action.title}
                </h3>
              </div>
              <ArrowUpRight className="mb-0.5 size-5 shrink-0 text-brand/35 transition-colors duration-200 group-hover:text-brand" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
