'use client';

import { useChatNavHref } from '@/hooks/use-chat-nav-href';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { Home, Layers, MessageSquare, UsersRound } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function MobileBottomNav() {
  const pathname = usePathname();
  const chatHref = useChatNavHref();
  const t = useTranslations('Sidebar');

  const mobileNavItems = [
    {
      title: t('business.overview'),
      url: '/dashboard/business/overview',
      icon: Home,
      matchPath: '/dashboard/business/overview',
    },
    {
      title: t('business.connectApp'),
      url: '/dashboard/business/connect-app',
      icon: Layers,
      matchPath: '/dashboard/business/connect-app',
    },
    {
      title: t('chat'),
      url: chatHref,
      icon: MessageSquare,
      matchPath: '/dashboard/chat',
    },
    {
      title: t('customer.customers'),
      url: '/dashboard/customer/customers',
      icon: UsersRound,
      matchPath: '/dashboard/customer/customers',
    },
  ];

  const isDashboardRoot = pathname === '/dashboard/business/overview';
  const isWabaSection = pathname === '/dashboard/business/connect-app';
  const chatSegments = pathname.startsWith('/dashboard/chat')
    ? pathname.split('/').filter(Boolean) // e.g. ['dashboard', 'chat', 'wabaId', 'convId']
    : [];
  const isChatSection =
    pathname === '/dashboard/chat' ||
    (chatSegments[0] === 'dashboard' &&
      chatSegments[1] === 'chat' &&
      chatSegments.length <= 3); // allows /dashboard/chat/:wabaId, blocks /dashboard/chat/:wabaId/:convId
  const isCustomersSection = pathname === '/dashboard/customer/customers';
  const shouldShowMenu =
    isDashboardRoot || isWabaSection || isChatSection || isCustomersSection;

  if (!shouldShowMenu) {
    return null;
  }

  return (
    <>
      <div className="h-16 md:hidden" />
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/85 md:hidden">
        <div className="grid h-16 grid-cols-4 px-2 pb-[env(safe-area-inset-bottom)]">
          {mobileNavItems.map((item) => {
            const isActive =
              pathname === item.matchPath ||
              (item.matchPath !== '/dashboard/business/overview' &&
                pathname.startsWith(`${item.matchPath}/`));

            return (
              <Link
                key={item.matchPath}
                href={item.url}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon
                  className={cn('size-4', isActive ? 'text-primary' : '')}
                />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
