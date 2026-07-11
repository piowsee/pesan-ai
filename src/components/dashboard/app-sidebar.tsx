'use client';

import { SidebarProfileMenu } from '@/components/dashboard/sidebar-profile-menu';
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
import { useChatNavHref } from '@/hooks/use-chat-nav-href';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { User } from '@/types/user';
import { Home, MessageSquare, UsersRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { FaWhatsapp } from 'react-icons/fa6';

export function AppSidebar({ user }: { user: User | null }) {
  const pathname = usePathname();
  const chatHref = useChatNavHref();
  const t = useTranslations('Sidebar');

  const navItems = [
    {
      title: t('home'),
      url: '/dashboard',
      icon: Home,
      matchPath: '/dashboard',
    },
    {
      title: t('wabaManagement'),
      url: '/dashboard/waba',
      icon: FaWhatsapp,
      matchPath: '/dashboard/waba',
    },
    {
      title: t('chat'),
      url: chatHref,
      icon: MessageSquare,
      matchPath: '/dashboard/chat',
    },
    {
      title: t('customers'),
      url: '/dashboard/customers',
      icon: UsersRound,
      matchPath: '/dashboard/customers',
    },
  ];

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
                  pathname.startsWith('/dashboard/chat')
                    ? 'bg-transparent text-brand'
                    : 'text-brand',
                  'absolute top-0 right-0 size-10! shrink-0 bg-transparent transition-colors hover:bg-transparent active:bg-transparent aria-expanded:bg-transparent [&_svg]:!size-5',
                )}
              />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="truncate font-semibold whitespace-nowrap text-brand/70 transition-opacity duration-200 group-data-[collapsible=icon]:hidden">
            {t('navigation')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      item.matchPath === '/dashboard'
                        ? pathname === item.matchPath
                        : pathname === item.matchPath ||
                          pathname.startsWith(`${item.matchPath}/`)
                    }
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
            {user && <SidebarProfileMenu user={user} />}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
