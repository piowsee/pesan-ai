import { PageHeader } from '@/components/admin/header';
import { requireAdmin } from '@/lib/auth/auth-page-helper';
import { ReactNode } from 'react';

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();

  return (
    <main className="relative min-h-svh overflow-hidden bg-muted/25 px-6 pt-20 font-sans">
      <div className="pointer-events-none absolute -left-24 top-16 size-80 rounded-full bg-brand/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-12 size-96 rounded-full bg-brand/10 blur-3xl" />

      <PageHeader />

      <div className="relative">{children}</div>
    </main>
  );
}
