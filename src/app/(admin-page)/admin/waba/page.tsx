import { WabaTable } from '@/components/admin/waba/waba-table';
import { PageHeader } from '@/components/header';
import { requireAdmin } from '@/lib/auth/auth-page-helper';

export default async function AdminWabaPage() {
  await requireAdmin();

  return (
    <main className="relative flex min-h-svh flex-col overflow-hidden bg-muted/25 px-6 pt-20 font-sans">
      <div className="pointer-events-none absolute -left-24 top-16 size-80 rounded-full bg-brand/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-12 size-96 rounded-full bg-brand/10 blur-3xl" />

      <PageHeader />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 py-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            WABA Management
          </h1>
          <p className="text-sm text-muted-foreground">
            View all WhatsApp Business Accounts and assign webhooks to them.
          </p>
        </div>

        <WabaTable />
      </div>
    </main>
  );
}
