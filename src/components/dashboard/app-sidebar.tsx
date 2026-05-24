'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Home, LogOut, MessageSquare } from 'lucide-react';
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
            <div className="flex w-full items-center gap-2 px-1 py-1">
              <div className="pointer-events-none flex aspect-square size-8 items-center justify-center rounded-lg select-none group-data-[collapsible=icon]:hidden">
                <Image
                  src="/pesan-ai-black-logo.png"
                  alt="pesan-ai"
                  width={32}
                  height={32}
                  className="h-auto w-full object-contain select-none dark:invert"
                  draggable={false}
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden text-brand">
                <span className="truncate text-lg font-bold tracking-tight select-none">
                  pesan-ai
                </span>
              </div>
              <SidebarTrigger
                className={cn(
                  pathname === '/dashboard/chat'
                    ? 'bg-muted text-brand'
                    : 'text-brand',
                  '[&_svg]:size-5',
                )}
              />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-brand/70 font-semibold">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    variant="activePrimary"
                    className="text-brand hover:text-brand data-active:text-brand h-12 px-3 text-[15px] [&_svg]:size-5 group-data-[collapsible=icon]:!h-12 group-data-[collapsible=icon]:!w-full group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center"
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span className="group-data-[collapsible=icon]:hidden">
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
        <SidebarMenu>
          <SidebarMenuItem>
            {user && (
              <SidebarMenuButton
                size="lg"
                className="mb-2 h-12 w-full group-data-[collapsible=icon]:!h-12 group-data-[collapsible=icon]:!w-full group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center"
              >
                <Avatar className="h-8 w-8 rounded-lg shrink-0">
                  <AvatarImage src={user.image ?? undefined} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {user.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight text-brand group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-bold">{user.name}</span>
                  <span className="truncate text-xs text-brand/70 font-medium">
                    {user.email}
                  </span>
                </div>
              </SidebarMenuButton>
            )}
            <SidebarMenuButton
              onClick={handleSignOut}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive w-full h-12 text-[15px] [&_svg]:size-5 group-data-[collapsible=icon]:!h-12 group-data-[collapsible=icon]:!w-full group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center"
            >
              <LogOut />
              <span className="group-data-[collapsible=icon]:hidden">
                Sign Out
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
