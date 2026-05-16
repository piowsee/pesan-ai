import { WabaTable } from '@/components/admin/waba/waba-table';

export default async function AdminWabaPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-8">
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
  );
}
