import { AppSidebar } from '@/components/dashboard/app-sidebar';
import { MobileBottomNav } from '@/components/dashboard/mobile-bottom-nav';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { requireUser } from '@/lib/auth/auth-page-helper';
import { ReactNode } from 'react';

// NOTE: Layout server data won't auto-update on client navigation.
// Call `router.refresh()` or other event trigger for layout
// after any user profile update to re-run server code and get fresh session data.
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <main className="flex flex-1 flex-col h-[100dvh] bg-background">
          <div className="h-full w-full flex-1 overflow-hidden">{children}</div>
          <MobileBottomNav />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
