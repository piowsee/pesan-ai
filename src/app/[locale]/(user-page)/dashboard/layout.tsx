import { AppSidebar } from '@/components/dashboard/app-sidebar';
import { MobileBottomNav } from '@/components/dashboard/mobile-bottom-nav';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { routing } from '@/i18n/routing';
import { AuthPageHelper } from '@/lib/auth/auth-page-helper';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { type CSSProperties, ReactNode } from 'react';

// NOTE: Layout server data won't auto-update on client navigation.
// Call `router.refresh()` or other event trigger for layout
// after any user profile update to re-run server code and get fresh session data.
export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const user = await AuthPageHelper.requireUser();

  return (
    <SidebarProvider
      defaultOpen={false}
      style={
        {
          '--sidebar-width': '16rem',
          '--sidebar-width-icon': '4.25rem',
        } as CSSProperties
      }
    >
      <AppSidebar user={user} />
      <SidebarInset>
        <main className="flex flex-1 flex-col h-dvh bg-background">
          <div className="h-full w-full flex-1 overflow-hidden">{children}</div>
          <MobileBottomNav />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
