import { User } from '@/types/user';

export function WelcomeHeader({ user }: { user: User | null }) {
  if (!user) return null;

  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold tracking-tight">
        Welcome back, {user.name}!
      </h1>
      <p className="text-muted-foreground mt-2">
        Here is an overview of your WhatsApp Business Accounts and recent
        activity.
      </p>
    </div>
  );
}
