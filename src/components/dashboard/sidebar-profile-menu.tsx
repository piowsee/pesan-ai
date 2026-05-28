'use client';

import { PasswordSettingsDialog } from '@/components/dashboard/password-settings-dialog';
import { ProfileSettingsDialog } from '@/components/dashboard/profile-settings-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { authClient } from '@/lib/auth/auth-client';
import { User } from '@/types/user';
import { LogOut, Settings, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SidebarProfileMenu({ user }: { user: User }) {
  const router = useRouter();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/id/login');
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
      <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
        {user.name}
      </span>
    </SidebarMenuButton>
  );

  return (
    <>
      <DropdownMenu>
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" align="center">
              Buka profil
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
            <DropdownMenuItem
              className="cursor-pointer gap-3 rounded-md px-2.5 py-2.5 text-brand hover:bg-primary/5 focus:bg-primary/5 focus:text-brand"
              onSelect={() => setIsProfileOpen(true)}
            >
              <UserRound />
              <span>Profil</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-3 rounded-md px-2.5 py-2.5 text-brand hover:bg-primary/5 focus:bg-primary/5 focus:text-brand"
              onSelect={() => setIsPasswordOpen(true)}
            >
              <Settings />
              <span>Settings</span>
            </DropdownMenuItem>
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
              <span>Logout</span>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileSettingsDialog
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        user={user}
      />

      <PasswordSettingsDialog
        open={isPasswordOpen}
        onOpenChange={setIsPasswordOpen}
        user={user}
      />
    </>
  );
}
