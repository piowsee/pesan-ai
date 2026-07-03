'use client';

import { cn } from '@/lib/utils';
import { Home, Layers, MessageSquare, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const mobileNavItems = [
  { title: 'Home', url: '/dashboard', icon: Home },
  { title: 'WABA', url: '/dashboard/waba', icon: Layers },
  { title: 'Chat', url: '/dashboard/chat', icon: MessageSquare },
  { title: 'Customers', url: '/dashboard/customers', icon: UsersRound },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  const isDashboardRoot = pathname === '/dashboard';
  const isWabaSection = pathname === '/dashboard/waba';
  const chatSegments = pathname.startsWith('/dashboard/chat')
    ? pathname.split('/').filter(Boolean) // e.g. ['dashboard', 'chat', 'wabaId', 'convId']
    : [];
  const isChatSection =
    pathname === '/dashboard/chat' ||
    (chatSegments[0] === 'dashboard' &&
      chatSegments[1] === 'chat' &&
      chatSegments.length <= 3); // allows /dashboard/chat/:wabaId, blocks /dashboard/chat/:wabaId/:convId
  const isCustomersSection = pathname === '/dashboard/customers';
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
              pathname === item.url ||
              (item.url !== '/dashboard' &&
                pathname.startsWith(`${item.url}/`));

            return (
              <Link
                key={item.url}
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
