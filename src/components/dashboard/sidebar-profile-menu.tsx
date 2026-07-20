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
import { SidebarMenuButton } from '@/components/ui/sidebar';
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
      className="h-10 w-full cursor-pointer justify-start gap-2 px-0 text-foreground/60 transition-colors duration-200 ease-out hover:bg-transparent hover:text-brand focus-visible:ring-0 data-open:bg-transparent data-open:text-brand group-data-[collapsible=icon]:h-10! group-data-[collapsible=icon]:w-full! group-data-[collapsible=icon]:p-0!"
    >
      <Avatar className="mx-1 size-8 rounded-full">
        <AvatarImage src={user.image ?? undefined} alt={user.name} />
        <AvatarFallback className="rounded-full bg-brand text-brand-foreground">
          {user.name?.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 max-w-32 flex-1 truncate text-sm font-semibold opacity-100 transition-[max-width,opacity] duration-200 ease-out group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
        {user.name}
      </span>
      <MdUnfoldMore
        aria-hidden="true"
        className="max-w-4 shrink-0 overflow-hidden text-muted-foreground opacity-100 transition-[max-width,opacity] duration-200 ease-out group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0"
      />
    </SidebarMenuButton>
  );

  return (
    <>
      <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>

        <DropdownMenuContent
          side="top"
          align="start"
          sideOffset={10}
          className="w-60 rounded-lg border p-0 text-foreground shadow-lg"
        >
          <div className="flex items-center gap-3 px-4 py-4">
            <Avatar className="size-10 rounded-full">
              <AvatarImage src={user.image ?? undefined} alt={user.name} />
              <AvatarFallback className="bg-brand text-brand-foreground">
                {user.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {user.name}
              </p>
              <p className="truncate text-xs text-foreground/70">
                {user.email}
              </p>
            </div>
          </div>

          <div className="px-4">
            <div className="h-px bg-border" />
          </div>

          <div className="p-2">
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="cursor-pointer gap-3 rounded-md px-2.5 py-2.5 text-foreground/65 hover:bg-brand/5 hover:text-brand focus:bg-brand/10 focus:text-brand"
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
                  className="cursor-pointer gap-3 rounded-md px-2.5 py-2.5 text-foreground/65 hover:bg-brand/5 hover:text-brand focus:bg-brand/10 focus:text-brand data-open:bg-brand/10 data-open:text-brand"
                  onClick={() => openSettings('general')}
                >
                  <Settings />
                  <span>{t('settings')}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  sideOffset={8}
                  className="relative w-44 rounded-lg border p-1.5 text-foreground shadow-lg before:absolute before:top-0 before:-left-2 before:h-full before:w-2 before:content-['']"
                >
                  <DropdownMenuGroup className="flex flex-col gap-1">
                    <DropdownMenuItem
                      className="cursor-pointer gap-3 rounded-md px-2.5 py-2.5 text-foreground/65 hover:bg-brand/5 hover:text-brand focus:bg-brand/10 focus:text-brand"
                      onSelect={() => openSettings('general')}
                    >
                      <Settings />
                      <span>{t('general')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer gap-3 rounded-md px-2.5 py-2.5 text-foreground/65 hover:bg-brand/5 hover:text-brand focus:bg-brand/10 focus:text-brand"
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
                className="cursor-pointer gap-3 rounded-md px-2.5 py-2.5 text-foreground/65 hover:bg-brand/5 hover:text-brand focus:bg-brand/10 focus:text-brand"
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
            <div className="h-px bg-border" />
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
