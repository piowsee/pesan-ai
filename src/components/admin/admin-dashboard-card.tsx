import { Link } from '@/i18n/navigation';
import { ArrowUpRight, CircleUser, UserPlus, Webhook } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function AdminDashboardCard() {
  const t = useTranslations('Admin.AdminDashboardCard');

  const ADMIN_NAVIGATION = [
    {
      href: '/admin/user',
      label: t('navigation.user.label'),
      description: t('navigation.user.description'),
      icon: UserPlus,
    },
    {
      href: '/admin/webhook',
      label: t('navigation.webhook.label'),
      description: t('navigation.webhook.description'),
      icon: Webhook,
    },
    {
      href: '/admin/waba',
      label: t('navigation.waba.label'),
      description: t('navigation.waba.description'),
      icon: CircleUser,
    },
  ] as const;

  return (
    <div className="w-full max-w-5xl">
      <section className="mb-10">
        <h1 className="text-2xl font-semibold leading-snug tracking-tight text-brand sm:text-3xl">
          {t('title')}
        </h1>
        <p className="mt-1 max-w-2xl text-[0.9rem] leading-relaxed text-brand">
          {t('description')}
        </p>
      </section>

      <nav
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Admin navigation"
      >
        {ADMIN_NAVIGATION.map(({ href, label, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex min-h-44 flex-col justify-between rounded-sm border border-brand/8 bg-brand/5 px-5 py-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-6 flex items-start justify-between">
              <Icon className="size-6 text-brand/50" />
            </div>

            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand/60">
                  {label}
                </p>
                <h2 className="max-w-sm text-lg font-semibold leading-snug text-brand">
                  {description}
                </h2>
              </div>
              <ArrowUpRight className="mb-0.5 size-5 shrink-0 text-brand/35 transition-colors duration-200 group-hover:text-brand" />
            </div>
          </Link>
        ))}
      </nav>
    </div>
  );
}
