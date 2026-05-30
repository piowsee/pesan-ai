'use client';

import { cn } from '@/lib/utils';
import { ArrowUpRight, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { FaWhatsapp } from 'react-icons/fa6';

const actions = [
  {
    eyebrow: 'Inbox',
    title: 'Reply to customer conversations',
    href: '/dashboard/chat',
    icon: MessageSquare,
    helper:
      'Open the Inbox panel to monitor conversation queues, assign agents, and respond to messages in real-time.',
    iconColor: 'text-brand/50',
  },
  {
    eyebrow: 'WABA',
    title: 'Manage WhatsApp Business accounts',
    href: '/dashboard/waba',
    icon: FaWhatsapp,
    helper:
      'Go to WABA settings to manage number status, Meta verification, and messaging tier limits.',
    iconColor: 'text-[#25D366]',
  },
];

export function QuickActions() {
  return (
    <section className="mb-8">
      {/* Section label */}
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-brand/80">Quick Actions</h2>
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
                <h3 className="max-w-sm text-lg font-semibold leading-snug text-brand">
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
