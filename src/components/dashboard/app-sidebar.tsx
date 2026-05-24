'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { authClient } from '@/lib/auth/auth-client';
import { cn } from '@/lib/utils';
import { User } from '@/types/user';
import { Home, LogOut, MessageSquare, Settings, UserRound } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FaWhatsapp } from 'react-icons/fa6';

const navItems = [
  { title: 'Home', url: '/dashboard', icon: Home },
  { title: 'WABA Management', url: '/dashboard/waba', icon: FaWhatsapp },
  { title: 'Chat', url: '/dashboard/chat', icon: MessageSquare },
];

export function AppSidebar({ user }: { user: User | null }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/id/login');
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="relative h-10 w-full pr-12 pl-1 group-data-[collapsible=icon]:pr-0 group-data-[collapsible=icon]:pl-0">
              <div className="flex h-full items-center gap-2 overflow-hidden transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0">
                <div className="pointer-events-none flex aspect-square size-8 items-center justify-center rounded-lg select-none">
                  <Image
                    src="/pesan-ai-black-logo.png"
                    alt="pesan-ai"
                    width={32}
                    height={32}
                    className="h-auto w-full object-contain select-none dark:invert"
                    draggable={false}
                  />
                </div>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight text-brand">
                  <span className="truncate text-lg font-bold tracking-tight select-none">
                    pesan-ai
                  </span>
                </div>
              </div>
              <SidebarTrigger
                className={cn(
                  pathname === '/dashboard/chat'
                    ? 'bg-muted text-brand'
                    : 'text-brand',
                  'absolute top-0 right-0 !size-10 shrink-0 transition-colors [&_svg]:!size-5',
                )}
              />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="truncate font-semibold whitespace-nowrap text-brand/70 transition-opacity duration-200 group-data-[collapsible=icon]:hidden">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    variant="activePrimary"
                    className="h-10 px-0 text-[15px] text-brand hover:text-brand data-active:text-brand group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-0 [&_svg]:size-5"
                  >
                    <Link href={item.url}>
                      <span className="flex size-10 shrink-0 items-center justify-center">
                        <item.icon />
                      </span>
                      <span className="truncate whitespace-nowrap transition-[opacity,width] duration-200 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0">
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu className="gap-2">
          <SidebarMenuItem className="flex flex-col gap-2">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="h-10 w-full gap-2 px-2 text-brand hover:bg-primary/5 hover:text-brand focus-visible:ring-0 data-open:bg-transparent data-open:text-brand group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!p-0"
                  >
                    <Avatar className="size-8 rounded-full">
                      <AvatarImage
                        src={user.image ?? undefined}
                        alt={user.name}
                      />
                      <AvatarFallback className="rounded-full bg-brand text-brand-foreground">
                        {user.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
                      {user.name}
                    </span>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  side="top"
                  align="start"
                  sideOffset={10}
                  className="w-60 rounded-lg border border-brand/20 p-0 shadow-lg"
                >
                  <div className="flex items-center gap-3 px-4 py-4">
                    <Avatar className="size-10 rounded-full">
                      <AvatarImage
                        src={user.image ?? undefined}
                        alt={user.name}
                      />
                      <AvatarFallback className="bg-brand text-brand-foreground">
                        {user.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-brand">
                        {user.name}
                      </p>
                      <p className="truncate text-xs text-brand">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <DropdownMenuSeparator className="mx-4 my-0 bg-brand/20" />

                  <DropdownMenuGroup className="p-2">
                    <DropdownMenuItem className="cursor-pointer gap-3 rounded-md px-2.5 py-2.5 text-brand hover:bg-primary/5 focus:bg-primary/5 focus:text-brand">
                      <UserRound />
                      <span>Profil</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer gap-3 rounded-md px-2.5 py-2.5 text-brand hover:bg-primary/5 focus:bg-primary/5 focus:text-brand">
                      <Settings />
                      <span>Settings</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator className="mx-4 my-0 bg-brand/20" />

                  <DropdownMenuGroup className="p-2">
                    <DropdownMenuItem
                      variant="destructive"
                      className="cursor-pointer gap-3 rounded-md px-2.5 py-2.5 hover:bg-primary/5 focus:bg-primary/5 focus:text-destructive"
                      onClick={handleSignOut}
                    >
                      <LogOut />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
