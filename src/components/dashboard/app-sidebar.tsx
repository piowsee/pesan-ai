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

  const chatItem = {
    title: t('chat'),
    url: chatHref,
    icon: MessageSquare,
    matchPath: '/dashboard/chat',
  };

  const workspaceItems = [
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
  ];

  const customerItems = [
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
            <div className="relative h-10 w-full pr-10 group-data-[collapsible=icon]:pr-0">
              <div className="flex h-full items-center gap-1 overflow-hidden">
                <div className="pointer-events-none flex aspect-square size-10 shrink-0 items-center justify-center rounded-lg select-none">
                  <Image
                    src="/pesan-ai-black-logo.png"
                    alt="pesan-ai"
                    width={28}
                    height={28}
                    className="size-7 object-contain select-none"
                    draggable={false}
                  />
                </div>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="max-w-32 truncate text-base font-bold text-black opacity-100 transition-[max-width,opacity] duration-200 ease-out select-none group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
                    Pesan AI
                  </span>
                </div>
              </div>
              <SidebarTrigger
                className={cn(
                  pathname.startsWith('/dashboard/chat')
                    ? 'bg-transparent text-foreground'
                    : 'text-foreground',
                  'absolute top-0 right-0 size-10! shrink-0 bg-transparent transition-colors duration-200 ease-out hover:bg-transparent active:bg-transparent aria-expanded:bg-transparent group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0 [&_svg]:size-4.5!',
                )}
              />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Chat Section */}
        <SidebarGroup className="pb-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === chatItem.matchPath ||
                    pathname.startsWith(`${chatItem.matchPath}/`)
                  }
                  variant="activePrimary"
                  className="h-10 gap-1 px-0 text-sm font-normal! group-data-[collapsible=icon]:h-10! group-data-[collapsible=icon]:w-full! group-data-[collapsible=icon]:p-0! [&_svg]:size-5 [&_svg]:text-brand! [&_svg]:duration-200 group-data-[collapsible=icon]:[&_svg]:text-black/40!"
                >
                  <Link href={chatItem.url}>
                    <span className="flex size-10 shrink-0 items-center justify-center">
                      <chatItem.icon />
                    </span>
                    <span className="max-w-32 truncate whitespace-nowrap opacity-100 transition-[max-width,opacity] duration-200 ease-out group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0 text-foreground!">
                      {chatItem.title}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Workspace Section */}
        <SidebarGroup className="pt-2 pb-0">
          <SidebarGroupLabel className="flex items-center justify-start font-bold text-muted-foreground group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:opacity-100">
            <span className="block max-w-32 flex-1 truncate whitespace-nowrap text-left text-brand/70! opacity-100 transition-[max-width,opacity] duration-200 ease-out group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:opacity-0">
              {t('workspace')}
            </span>
            <span className="block h-px max-w-0 flex-1 overflow-hidden bg-border opacity-0 transition-[max-width,opacity] duration-200 ease-out group-data-[collapsible=icon]:max-w-10 group-data-[collapsible=icon]:opacity-100" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      item.matchPath === '/dashboard'
                        ? pathname === item.matchPath
                        : pathname === item.matchPath ||
                          pathname.startsWith(`${item.matchPath}/`)
                    }
                    variant="activePrimary"
                    className="h-10 gap-1 px-0 text-sm font-normal! group-data-[collapsible=icon]:h-10! group-data-[collapsible=icon]:w-full! group-data-[collapsible=icon]:p-0! [&_svg]:size-5 [&_svg]:text-brand! [&_svg]:duration-200 group-data-[collapsible=icon]:[&_svg]:text-black/40!"
                  >
                    <Link href={item.url}>
                      <span className="flex size-10 shrink-0 items-center justify-center">
                        <item.icon />
                      </span>
                      <span className="max-w-32 truncate whitespace-nowrap opacity-100 transition-[max-width,opacity] duration-200 ease-out group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0 text-foreground!">
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Customer Section */}
        <SidebarGroup className="pt-2 pb-0">
          <SidebarGroupLabel className="flex items-center justify-start font-bold text-muted-foreground group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:opacity-100">
            <span className="block max-w-32 flex-1 truncate whitespace-nowrap text-left text-brand/70! opacity-100 transition-[max-width,opacity] duration-200 ease-out group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:opacity-0">
              {t('customer')}
            </span>
            <span className="block h-px max-w-0 flex-1 overflow-hidden bg-border opacity-0 transition-[max-width,opacity] duration-200 ease-out group-data-[collapsible=icon]:max-w-10 group-data-[collapsible=icon]:opacity-100" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {customerItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      item.matchPath === '/dashboard'
                        ? pathname === item.matchPath
                        : pathname === item.matchPath ||
                          pathname.startsWith(`${item.matchPath}/`)
                    }
                    variant="activePrimary"
                    className="h-10 gap-1 px-0 text-sm font-normal! group-data-[collapsible=icon]:h-10! group-data-[collapsible=icon]:w-full! group-data-[collapsible=icon]:p-0! [&_svg]:size-5 [&_svg]:text-brand! [&_svg]:duration-200 group-data-[collapsible=icon]:[&_svg]:text-black/40!"
                  >
                    <Link href={item.url}>
                      <span className="flex size-10 shrink-0 items-center justify-center">
                        <item.icon />
                      </span>
                      <span className="max-w-32 truncate whitespace-nowrap opacity-100 transition-[max-width,opacity] duration-200 ease-out group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0 text-foreground!">
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
