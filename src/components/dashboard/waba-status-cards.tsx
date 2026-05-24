'use client';

import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useWabas } from '@/hooks/use-wabas';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, CircleAlert } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa6';

export function WabaStatusCards() {
  const { data, isLoading, isError } = useWabas(1, 100);

  if (isLoading) {
    return (
      <section className="mb-8">
        <Skeleton className="mb-3 h-5 w-32" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-border p-5">
              <Skeleton className="mb-5 h-4 w-20" />
              <Skeleton className="h-9 w-14" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="mb-8">
        <div className="rounded-lg border border-destructive/20 px-5 py-4 text-sm text-destructive">
          Ringkasan akun WhatsApp belum bisa dimuat.
        </div>
      </section>
    );
  }

  const wabas = data?.wabas || [];
  const totalWabas = data.total || 0;
  const activeWabas = wabas.filter(
    (w) => w.status.toLowerCase() === 'active',
  ).length;
  const suspendedWabas = wabas.filter(
    (w) => w.status.toLowerCase() === 'suspended',
  ).length;

  const stats = [
    {
      label: 'Akun WhatsApp',
      value: totalWabas,
      icon: FaWhatsapp,
      helper:
        'Total akun WhatsApp Business (WABA) yang telah terintegrasi di dalam workspace ini.',
      iconColor: 'text-[#25D366]',
    },
    {
      label: 'Siap dipakai',
      value: activeWabas,
      icon: CheckCircle2,
      helper:
        'Jumlah akun berstatus aktif yang dapat digunakan untuk memproses pesan masuk dan keluar secara normal.',
      iconColor: 'text-[oklch(0.52_0.12_190)]',
    },
    {
      label: 'Perlu perhatian',
      value: suspendedWabas,
      icon: AlertTriangle,
      helper:
        'Akun yang sedang mengalami kendala (terputus, terblokir, atau butuh verifikasi Meta). Segera periksa agar operasional tidak terganggu.',
      iconColor: 'text-[oklch(0.55_0.12_30)]',
    },
  ];

  return (
    <section className="mb-10">
      {/* Section label */}
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-brand/80">Kondisi akun</h2>
      </div>

      {/* Stat tiles */}
      <div className="grid gap-5 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-sm border border-brand/5 bg-brand/5 p-5 shadow-sm"
          >
            <div className="mb-4 flex items-start justify-between">
              <stat.icon className={cn('size-6', stat.iconColor)} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-brand transition hover:text-brand/80"
                    aria-label={`Info ${stat.label}`}
                  >
                    <CircleAlert className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-white text-brand border border-border shadow-md [&_svg]:fill-white [&_svg]:!bg-white">
                  {stat.helper}
                </TooltipContent>
              </Tooltip>
            </div>

            <div>
              <p className="text-3xl font-semibold tracking-tight text-brand">
                {stat.value}
              </p>
              <p className="mt-1 text-sm font-medium text-brand/60">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
