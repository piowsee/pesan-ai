import { User } from '@/types/user';

export function WelcomeHeader({ user }: { user: User | null }) {
  if (!user) return null;

  const firstName = user.name?.split(' ')[0] || user.name;

  /* Time-aware greeting */
  const hour = new Date().getHours();
  let greeting = 'Selamat pagi';
  if (hour >= 11 && hour < 15) greeting = 'Selamat siang';
  else if (hour >= 15 && hour < 18) greeting = 'Selamat sore';
  else if (hour >= 18 || hour < 4) greeting = 'Selamat malam';

  return (
    <section className="mb-10">
      <p className="mb-2 text-base font-medium text-brand/60">
        {greeting}, {firstName}
      </p>
      <h1 className="text-2xl font-semibold leading-snug tracking-tight text-brand sm:text-3xl">
        Ringkasan Aktivitas Akun Anda
      </h1>
      <p className="mt-1 text-[0.9rem] leading-relaxed text-brand">
        Tinjau status operasional WABA dan kendalikan lalu lintas pesan masuk
        dari satu panel kendali.
      </p>
    </section>
  );
}
