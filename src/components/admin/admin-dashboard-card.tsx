import { Button } from '@/components/ui/button';
import { CircleUser, UserPlus, Webhook } from 'lucide-react';
import Link from 'next/link';

const ADMIN_NAVIGATION = [
  {
    href: '/admin/user',
    label: 'Manage User Account',
    description: 'Add and manage user accounts.',
    icon: UserPlus,
  },
  {
    href: '/admin/webhook',
    label: 'Manage Webhook',
    description: 'Configure and monitor active webhooks.',
    icon: Webhook,
  },
  {
    href: '/admin/waba',
    label: 'Manage User WABA',
    description: 'Assign Webhook to WABA',
    icon: CircleUser,
  },
] as const;

export function AdminDashboardCard() {
  return (
    <div className="w-full max-w-lg">
      <div className="mb-10 flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Admin Dashboard
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Select a menu below to manage the system.
        </p>
      </div>

      <nav className="flex flex-col gap-3" aria-label="Admin navigation">
        {ADMIN_NAVIGATION.map(({ href, label, description, icon: Icon }) => (
          <Link key={href} href={href} className="group">
            <Button
              variant="outline"
              className="h-auto w-full cursor-pointer justify-start gap-4 rounded-xl border-border/60 px-5 py-5 shadow-sm transition-all hover:border-brand/40 hover:bg-accent/60 hover:shadow-md"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand transition-colors group-hover:bg-brand/15">
                <Icon className="size-5" />
              </div>
              <div className="flex flex-col items-start gap-0.5 text-left">
                <span className="text-sm font-semibold text-foreground">
                  {label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {description}
                </span>
              </div>
            </Button>
          </Link>
        ))}
      </nav>
    </div>
  );
}
