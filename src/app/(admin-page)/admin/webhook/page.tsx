import { CreateWebhookDialog } from '@/components/admin/webhook/create-webhook-dialog';
import { WebhookDocsDialog } from '@/components/admin/webhook/webhook-docs-dialog';
import { WebhookTable } from '@/components/admin/webhook/webhook-table';

export default async function AdminWebhookPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-8">
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
  );
}
