'use client';

import { isNavigationPathActive } from '@/components/dashboard/dashboard-navigation';
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
import { useDashboardNavigation } from '@/hooks/use-dashboard-navigation';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { User } from '@/types/user';
import Image from 'next/image';

export function AppSidebar({ user }: { user: User | null }) {
  const pathname = usePathname();
  const { chatItem, sections } = useDashboardNavigation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="relative h-10 w-full pr-10 transition-[padding] duration-200 ease-out group-data-[collapsible=icon]:pr-0">
              <div className="flex h-full items-center gap-1 overflow-hidden">
                <div className="pointer-events-none flex aspect-square size-10 shrink-0 items-center justify-center rounded-lg select-none">
                  <Image
                    src="/pesan-ai-black-logo.png"
                    alt="Pesan AI"
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
                  'absolute top-0 -right-2 size-10! shrink-0 bg-transparent transition-all duration-300 group-data-[collapsible=icon]:duration-75 ease-out hover:bg-transparent active:bg-transparent aria-expanded:bg-transparent group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0 [&_svg]:size-4.5!',
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
                  isActive={isNavigationPathActive({
                    matchPath: chatItem.matchPath,
                    pathname,
                  })}
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

        {sections.map((section) => (
          <SidebarGroup key={section.id} className="pt-2 pb-0">
            <SidebarGroupLabel className="flex items-center justify-start font-bold text-muted-foreground group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:opacity-100">
              <span className="block max-w-32 flex-1 truncate whitespace-nowrap text-left text-brand/70! opacity-100 transition-[max-width,opacity] duration-200 ease-out group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:opacity-0">
                {section.title}
              </span>
              <span className="block h-px max-w-0 flex-1 overflow-hidden bg-border opacity-0 transition-[max-width,opacity] duration-200 ease-out group-data-[collapsible=icon]:max-w-10 group-data-[collapsible=icon]:opacity-100" />
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isNavigationPathActive({
                        exact: item.exact,
                        matchPath: item.matchPath,
                        pathname,
                      })}
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
        ))}
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
