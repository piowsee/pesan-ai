'use client';

import { cn } from '@/lib/utils';
import { Home, Layers, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const mobileNavItems = [
  { title: 'Home', url: '/dashboard', icon: Home },
  { title: 'WABA', url: '/dashboard/waba', icon: Layers },
  { title: 'Chat', url: '/dashboard/chat', icon: MessageSquare },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('conversationId');

  const isFirstHierarchyPage =
    pathname === '/dashboard' ||
    pathname === '/dashboard/waba' ||
    pathname === '/dashboard/chat';
  const shouldShowMenu =
    isFirstHierarchyPage &&
    !(pathname === '/dashboard/chat' && Boolean(conversationId));

  if (!shouldShowMenu) {
    return null;
  }

  return (
    <>
      <div className="h-16 md:hidden" />
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/85 md:hidden">
        <div className="grid h-16 grid-cols-3 px-2 pb-[env(safe-area-inset-bottom)]">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.url;

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
