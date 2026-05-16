import { CreateUserDialog } from '@/components/admin/user/create-user-dialog';
import { UserTable } from '@/components/admin/user/user-table';

export default async function AdminUserPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            User Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Add and manage user accounts for the platform.
          </p>
        </div>

        <CreateUserDialog />
      </div>

      <UserTable />
    </div>
  );
}
