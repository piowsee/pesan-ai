'use client';

import {
  AccountSettingsDialog,
  type AccountSettingsTab,
} from '@/components/dashboard/account-settings-dialog';
import { ProfileSettingsDialog } from '@/components/dashboard/profile-settings-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useRouter } from '@/i18n/navigation';
import { authClient } from '@/lib/auth/auth-client';
import { User } from '@/types/user';
import {
  CircleQuestionMark,
  LockKeyhole,
  LogOut,
  Settings,
  UserRound,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { MdUnfoldMore } from 'react-icons/md';

const DOCS_URL = 'https://piowsee.github.io/pesan-ai/introduction.html';

export function SidebarProfileMenu({ user }: { user: User }) {
  const router = useRouter();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<AccountSettingsTab>('general');
  const t = useTranslations('ProfileMenu');

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/login');
  };

  const openSettings = (tab: AccountSettingsTab) => {
    setIsMenuOpen(false);
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  };

  const triggerButton = (
    <SidebarMenuButton
      size="lg"
      className="h-10 w-full cursor-pointer gap-3 px-2 text-brand hover:bg-primary/5 hover:text-brand focus-visible:ring-0 data-open:bg-transparent data-open:text-brand group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!p-0"
    >
      <Avatar className="size-8 rounded-full">
        <AvatarImage src={user.image ?? undefined} alt={user.name} />
        <AvatarFallback className="rounded-full bg-brand text-brand-foreground">
          {user.name?.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
        {user.name}
      </span>
      <MdUnfoldMore
        aria-hidden="true"
        className="shrink-0 text-brand/80 group-data-[collapsible=icon]:hidden"
      />
    </SidebarMenuButton>
  );

  return (
    <>
      <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" align="center">
              {t('openProfile')}
            </TooltipContent>
          </Tooltip>
        ) : (
          <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
        )}

        <DropdownMenuContent
          side="top"
          align="start"
          sideOffset={10}
          className="w-60 rounded-lg border border-brand/20 p-0 shadow-lg"
        >
          <div className="flex items-center gap-3 px-4 py-4">
            <Avatar className="size-10 rounded-full">
              <AvatarImage src={user.image ?? undefined} alt={user.name} />
              <AvatarFallback className="bg-brand text-brand-foreground">
                {user.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-brand">
                {user.name}
              </p>
              <p className="truncate text-xs text-brand">{user.email}</p>
            </div>
          </div>

          <div className="px-4">
            <div className="h-px bg-brand/20" />
          </div>

          <div className="p-2">
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="cursor-pointer gap-3 rounded-md px-2.5 py-2.5 text-brand hover:bg-primary/5 focus:bg-primary/5 focus:text-brand"
                onSelect={() => {
                  setIsMenuOpen(false);
                  setIsProfileOpen(true);
                }}
              >
                <UserRound />
                <span>{t('profile')}</span>
              </DropdownMenuItem>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger
                  className="cursor-pointer gap-3 rounded-md px-2.5 py-2.5 text-brand hover:bg-primary/5 focus:bg-primary/5 focus:text-brand data-open:bg-primary/5 data-open:text-brand"
                  onClick={() => openSettings('general')}
                >
                  <Settings />
                  <span>{t('settings')}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  sideOffset={8}
                  className="relative w-44 rounded-lg border border-brand/20 p-1.5 shadow-lg before:absolute before:top-0 before:-left-2 before:h-full before:w-2 before:content-['']"
                >
                  <DropdownMenuGroup className="flex flex-col gap-1">
                    <DropdownMenuItem
                      className="cursor-pointer gap-3 rounded-md px-2.5 py-2.5 text-brand hover:bg-primary/5 focus:bg-primary/5 focus:text-brand"
                      onSelect={() => openSettings('general')}
                    >
                      <Settings />
                      <span>{t('general')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer gap-3 rounded-md px-2.5 py-2.5 text-brand hover:bg-primary/5 focus:bg-primary/5 focus:text-brand"
                      onSelect={() => openSettings('security')}
                    >
                      <LockKeyhole />
                      <span>{t('security')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuItem
                asChild
                className="cursor-pointer gap-3 rounded-md px-2.5 py-2.5 text-brand hover:bg-primary/5 focus:bg-primary/5 focus:text-brand"
                onSelect={() => setIsMenuOpen(false)}
              >
                <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">
                  <CircleQuestionMark />
                  <span>{t('docs')}</span>
                </a>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </div>

          <div className="px-4">
            <div className="h-px bg-brand/20" />
          </div>

          <div className="p-2">
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer gap-3 rounded-md px-2.5 py-2.5 hover:bg-primary/5 focus:bg-primary/5 focus:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut />
              <span>{t('logout')}</span>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

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
