import { CreateWebhookDialog } from '@/components/admin/webhook/create-webhook-dialog';
import { WebhookDocsDialog } from '@/components/admin/webhook/webhook-docs-dialog';
import { WebhookTable } from '@/components/admin/webhook/webhook-table';
import { PageHeader } from '@/components/header';
import { requireAdmin } from '@/lib/auth/auth-page-helper';

export default async function AdminWebhookPage() {
  await requireAdmin();

  return (
    <main className="relative flex min-h-svh flex-col overflow-hidden bg-muted/25 px-6 pt-20 font-sans">
      <div className="pointer-events-none absolute -left-24 top-16 size-80 rounded-full bg-brand/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-12 size-96 rounded-full bg-brand/10 blur-3xl" />

      <PageHeader />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Webhook Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Add and manage webhook endpoints for the platform.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <WebhookDocsDialog />
            <CreateWebhookDialog />
          </div>
        </div>

        <WebhookTable />
      </div>
    </main>
  );
}
