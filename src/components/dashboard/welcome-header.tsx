import { User } from '@/types/user';

export function WelcomeHeader({ user }: { user: User | null }) {
  if (!user) return null;

  const firstName = user.name?.split(' ')[0] || user.name;

  /* Time-aware greeting */
  const hour = new Date().getHours();
  let greeting = 'Good morning';
  if (hour >= 11 && hour < 15) greeting = 'Good afternoon';
  else if (hour >= 15 && hour < 18) greeting = 'Good evening';
  else if (hour >= 18 || hour < 4) greeting = 'Good evening';

  return (
    <section className="mb-10">
      <p className="mb-2 text-base font-medium text-brand/60">
        {greeting}, {firstName}
      </p>
      <h1 className="text-2xl font-semibold leading-snug tracking-tight text-brand sm:text-3xl">
        Account Activity Summary
      </h1>
      <p className="mt-1 text-[0.9rem] leading-relaxed text-brand">
        Review WABA operational status and control incoming message traffic from
        a single control panel.
      </p>
    </section>
  );
}
