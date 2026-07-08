'use client';

import { useChatNavHref } from '@/hooks/use-chat-nav-href';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { ArrowUpRight, MessageSquare, UsersRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FaWhatsapp } from 'react-icons/fa6';

export function QuickActions() {
  const chatHref = useChatNavHref();
  const t = useTranslations('DashboardHome.quickActions');

  const actions = [
    {
      eyebrow: t('inbox.eyebrow'),
      title: t('inbox.title'),
      href: chatHref,
      icon: MessageSquare,
      helper: t('inbox.helper'),
      iconColor: 'text-brand/50',
    },
    {
      eyebrow: t('waba.eyebrow'),
      title: t('waba.title'),
      href: '/dashboard/waba',
      icon: FaWhatsapp,
      helper: t('waba.helper'),
      iconColor: 'text-[#25D366]',
    },
    {
      eyebrow: t('customers.eyebrow'),
      title: t('customers.title'),
      href: '/dashboard/customers',
      icon: UsersRound,
      helper: t('customers.helper'),
      iconColor: 'text-brand/50',
    },
  ];

  return (
    <section className="mb-8">
      {/* Section label */}
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-brand/80">
          {t('sectionTitle')}
        </h2>
      </div>

      {/* Action tiles */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
