'use client';

import { isNavigationPathActive } from '@/components/dashboard/dashboard-navigation';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useDashboardNavigation } from '@/hooks/use-dashboard-navigation';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function MobileSectionNav() {
  const pathname = usePathname();
  const t = useTranslations('Sidebar');
  const { sections } = useDashboardNavigation();
  const activeSection = sections.find((section) =>
    isNavigationPathActive({
      matchPath: section.matchPath,
      pathname,
    }),
  );

  if (!activeSection) {
    return null;
  }

  const activeItem =
    activeSection.items.find((item) =>
      isNavigationPathActive({
        exact: item.exact,
        matchPath: item.matchPath,
        pathname,
      }),
    ) ?? activeSection.items[0];
  const hasMenu = activeSection.items.length > 1;
  const SectionIcon = activeSection.icon;

  const sectionSummary = (
    <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
      <SectionIcon className="size-5 shrink-0 text-brand" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">
          {activeSection.title}
        </p>
        <p className="truncate text-sm font-semibold text-foreground">
          {activeItem.title}
        </p>
      </div>
      {hasMenu ? (
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      ) : null}
    </div>
  );

  if (!hasMenu) {
    return (
      <div className="flex h-14 shrink-0 items-center border-b border-brand/10 bg-background px-4 md:hidden">
        {sectionSummary}
      </div>
    );
  }

  return (
    <div className="flex h-14 shrink-0 items-center border-b border-brand/10 bg-background md:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="unstyled"
            className="flex h-14 w-full items-center px-4"
            aria-label={t('sectionNavigation', {
              section: activeSection.title,
            })}
          >
            {sectionSummary}
          </Button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="max-h-[min(78dvh,40rem)] gap-0 overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
        >
          <SheetHeader className="px-5 pt-5 pb-3">
            <SheetTitle>{activeSection.title}</SheetTitle>
            <SheetDescription>
              {t('sectionNavigation', { section: activeSection.title })}
            </SheetDescription>
          </SheetHeader>

          <nav
            aria-label={activeSection.title}
            className="flex flex-col gap-1 px-3 pb-3"
          >
            {activeSection.items.map((item) => {
              const isActive = isNavigationPathActive({
                exact: item.exact,
                matchPath: item.matchPath,
                pathname,
              });

              return (
                <SheetClose asChild key={item.id}>
                  <Link
                    href={item.url}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-brand/10 text-brand'
                        : 'text-foreground/70 hover:bg-brand/5 hover:text-brand',
                    )}
                  >
                    <item.icon className="size-5 shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                </SheetClose>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
