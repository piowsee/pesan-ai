import { WabaTable } from '@/components/admin/waba/waba-table';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export default async function AdminWabaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Admin.waba.page');
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-6 sm:py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-brand sm:text-3xl">
          {t('title')}
        </h1>
        <p className="text-sm text-brand/70">{t('description')}</p>
      </div>

      <WabaTable />
    </div>
  );
}
