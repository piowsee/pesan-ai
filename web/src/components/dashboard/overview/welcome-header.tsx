import { User } from '@/types/user';
import { getTranslations } from 'next-intl/server';

export async function WelcomeHeader({ user }: { user: User | null }) {
  if (!user) return null;

  const t = await getTranslations('DashboardHome');

  const firstName = user.name?.split(' ')[0] || user.name;

  /* Time-aware greeting */
  const hour = new Date().getHours();
  let greeting = t('greeting.morning');
  if (hour >= 11 && hour < 15) greeting = t('greeting.afternoon');
  else if (hour >= 15 && hour < 18) greeting = t('greeting.evening');
  else if (hour >= 18 || hour < 4) greeting = t('greeting.evening');

  return (
    <section className="mb-10">
      <p className="mb-2 text-base font-medium text-brand/60">
        {greeting}, {firstName}
      </p>
      <h1 className="text-2xl font-semibold leading-snug tracking-tight text-brand sm:text-3xl">
        {t('title')}
      </h1>
      <p className="mt-1 text-[0.9rem] leading-relaxed text-brand">
        {t('description')}
      </p>
    </section>
  );
}
