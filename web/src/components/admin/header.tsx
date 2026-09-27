'use client';

import { Container } from '@/components/Container';
import { SignOutButton } from '@/components/sign-out-button';
import { Button } from '@/components/ui/button';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { ChevronDown, LayoutDashboard } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

type AdminNavigationItem = {
  href: '/admin/user' | '/admin/webhook' | '/admin/waba';
  label: string;
};

function AdminPageDropdown({ items }: { items: AdminNavigationItem[] }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeItem =
    items.find((item) => pathname?.startsWith(item.href)) ?? items[0];

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const openMenu = useCallback(() => {
    clearCloseTimeout();
    setIsOpen(true);
  }, [clearCloseTimeout]);

  const closeMenu = useCallback(() => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      closeTimeoutRef.current = null;
    }, 120);
  }, [clearCloseTimeout]);

  useEffect(() => {
    return () => {
      clearCloseTimeout();
    };
  }, [clearCloseTimeout]);

  return (
    <div className="relative" onMouseEnter={openMenu} onMouseLeave={closeMenu}>
      <Button
        variant="unstyled"
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="inline-flex h-9 items-center gap-1.5 px-2 text-sm font-semibold text-brand/80 transition-colors hover:text-brand"
        onClick={() => setIsOpen((current) => !current)}
      >
        <LayoutDashboard aria-hidden="true" className="size-4" />
        <span>{activeItem.label}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'size-4 transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
        />
      </Button>

      <div
        role="menu"
        className={cn(
          'absolute right-0 top-full z-60 mt-2 min-w-48 bg-background py-1 shadow-md ring-1 ring-brand/20 transition-all duration-150',
          isOpen
            ? 'visible translate-y-0 opacity-100'
            : 'invisible -translate-y-1 opacity-0',
        )}
      >
        {items.map((item) => {
          const isActive = pathname?.startsWith(item.href);

          return (
            <Button
              asChild
              variant="unstyled"
              key={item.href}
              role="menuitem"
              className={cn(
                'block w-full px-4 py-2.5 text-left text-sm font-medium transition-colors',
                isActive
                  ? 'text-brand'
                  : 'text-brand/50 hover:text-brand focus:text-brand',
              )}
              onClick={() => setIsOpen(false)}
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export function PageHeader() {
  const t = useTranslations('Admin.Header');

  const navigationItems: AdminNavigationItem[] = [
    { href: '/admin/user', label: t('navigation.user') },
    { href: '/admin/webhook', label: t('navigation.webhook') },
    { href: '/admin/waba', label: t('navigation.waba') },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 select-none border-b border-brand/10 bg-background/95 font-sans shadow-sm backdrop-blur">
      <Container className="flex h-18 items-center justify-between gap-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2"
          draggable={false}
        >
          <Image
            src="/pesan-ai-black-logo.png"
            alt={t('logoAlt')}
            width={120}
            height={28}
            className="h-9 w-auto object-contain"
            priority
            draggable={false}
          />
          <span className="mb-1 text-xl font-bold tracking-tight text-brand">
            {t('brandName')}
          </span>
        </Link>

        <div className="flex items-center gap-2 py-1 sm:gap-3">
          <AdminPageDropdown items={navigationItems} />
          <SignOutButton className="h-10 rounded-full px-4 sm:px-5" />
        </div>
      </Container>
    </header>
  );
}
