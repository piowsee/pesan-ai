'use client';

import {
  AccountSettingsDialog,
  type AccountSettingsTab,
} from '@/components/dashboard/account-settings-dialog';
import {
  PESAN_AI_DOCS_URL,
  isDashboardDomainActive,
} from '@/components/dashboard/dashboard-navigation';
import { ProfileSettingsDialog } from '@/components/dashboard/profile-settings-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useDashboardNavigation } from '@/hooks/use-dashboard-navigation';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { authClient } from '@/lib/auth/auth-client';
import { cn } from '@/lib/utils';
import { User } from '@/types/user';
import {
  CircleQuestionMark,
  CircleUserRound,
  LogOut,
  Settings,
  UserRound,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';

export function MobileBottomNav({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const navigationT = useTranslations('Sidebar');
  const profileT = useTranslations('ProfileMenu');
  const { mobileDomains } = useDashboardNavigation();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<AccountSettingsTab>('general');
  const isAccountActive = isAccountMenuOpen || isProfileOpen || isSettingsOpen;

  function openProfile() {
    setIsAccountMenuOpen(false);
    setIsProfileOpen(true);
  }

  function openSettings() {
    setIsAccountMenuOpen(false);
    setSettingsTab('general');
    setIsSettingsOpen(true);
  }

  async function handleSignOut() {
    await authClient.signOut();
    router.push('/login');
  }

  return (
    <>
      <div className="h-16 md:hidden" />
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/85 md:hidden">
        <div className="grid h-16 grid-cols-4 px-2 pb-[env(safe-area-inset-bottom)]">
          {mobileDomains.map((domain) => {
            const isActive = isDashboardDomainActive(pathname, domain.id);

            return (
              <Link
                key={domain.id}
                href={domain.url}
                className={cn(
                  'flex min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <domain.icon
                  className={cn('size-4', isActive ? 'text-primary' : '')}
                />
                <span className="w-full truncate text-center">
                  {domain.title}
                </span>
              </Link>
            );
          })}

          <Sheet open={isAccountMenuOpen} onOpenChange={setIsAccountMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium transition-colors',
                  isAccountActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-label={navigationT('account.title')}
                aria-expanded={isAccountMenuOpen}
              >
                <CircleUserRound className="size-4" />
                <span className="w-full truncate text-center">
                  {navigationT('account.title')}
                </span>
              </button>
            </SheetTrigger>

            <SheetContent
              side="bottom"
              className="max-h-[min(82dvh,42rem)] gap-0 overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
            >
              <div className="sr-only">
                <SheetTitle>{navigationT('account.title')}</SheetTitle>
                <SheetDescription>
                  {navigationT('account.description')}
                </SheetDescription>
              </div>

              <div className="flex items-center gap-3 px-5 pt-5 pr-14 pb-4">
                <Avatar className="size-11 rounded-full">
                  <AvatarImage src={user.image ?? undefined} alt={user.name} />
                  <AvatarFallback className="rounded-full bg-brand text-brand-foreground">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-1 px-3 py-3">
                <AccountMenuButton onClick={openProfile} icon={UserRound}>
                  {profileT('profile')}
                </AccountMenuButton>
                <AccountMenuButton onClick={openSettings} icon={Settings}>
                  {profileT('settings')}
                </AccountMenuButton>
                <Button
                  asChild
                  variant="ghost"
                  className="min-h-12 justify-start gap-3 px-3 text-foreground/70 hover:bg-brand/5 hover:text-brand"
                >
                  <a
                    href={PESAN_AI_DOCS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <CircleQuestionMark data-icon="inline-start" />
                    {profileT('docs')}
                  </a>
                </Button>
              </div>

              <Separator />

              <div className="px-3 py-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-12 w-full justify-start gap-3 px-3 text-destructive hover:bg-destructive/5 hover:text-destructive"
                  onClick={() => void handleSignOut()}
                >
                  <LogOut data-icon="inline-start" />
                  {profileT('logout')}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      <ProfileSettingsDialog
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        user={user}
      />
      <AccountSettingsDialog
        activeTab={settingsTab}
        onActiveTabChange={setSettingsTab}
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        user={user}
      />
    </>
  );
}

function AccountMenuButton({
  children,
  icon: Icon,
  onClick,
}: {
  children: ReactNode;
  icon: typeof UserRound;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="min-h-12 justify-start gap-3 px-3 text-foreground/70 hover:bg-brand/5 hover:text-brand"
      onClick={onClick}
    >
      <Icon data-icon="inline-start" />
      {children}
    </Button>
  );
}
