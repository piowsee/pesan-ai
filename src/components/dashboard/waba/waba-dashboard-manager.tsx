'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { type Waba, useWabas } from '@/hooks/use-wabas';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Copy,
  MessageSquare,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa6';
import { toast } from 'sonner';

import { AddPhoneNumberDialog } from './add-phone-number-dialog/add-phone-number-dialog';
import { FacebookSdkScript } from './facebook-sdk-script';
import { WabaEmbeddedSignupButton } from './waba-embedded-signup-button';

const PAGE_SIZE = 10;

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  if (normalized === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[oklch(0.46_0.13_155)]">
        Aktif
        <CheckCircle2 className="size-4 shrink-0" />
      </span>
    );
  }

  if (normalized === 'suspended') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-destructive">
        Ditangguhkan
        <CircleAlert className="size-4 shrink-0" />
      </span>
    );
  }

  return <span className="text-sm font-semibold text-brand">{status}</span>;
}

function PhoneNumbersMenu({ waba }: { waba: Waba }) {
  const [isAddPhoneOpen, setIsAddPhoneOpen] = useState(false);
  const phoneNumberCount = waba.phoneNumbers.length;
  const triggerLabel =
    phoneNumberCount === 1 ? '1 nomor' : `${phoneNumberCount} nomor`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Kelola nomor WhatsApp"
            className="inline-flex max-w-full cursor-pointer items-center rounded-md text-left text-sm font-semibold text-brand underline-offset-4 transition hover:text-brand/80 hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span className="truncate">{triggerLabel}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>Nomor WhatsApp</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {phoneNumberCount === 0 ? (
            <div className="px-1.5 py-3 text-sm leading-relaxed text-brand">
              Belum ada nomor yang terhubung.
            </div>
          ) : (
            <div className="flex flex-col gap-1 px-1 py-1">
              {waba.phoneNumbers.map((phoneNumber) => (
                <div
                  key={phoneNumber.id}
                  className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm text-brand"
                >
                  <FaWhatsapp className="size-4 shrink-0" />
                  <span className="truncate">
                    {phoneNumber.displayPhoneNumber}
                  </span>
                </div>
              ))}
            </div>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="cursor-pointer text-brand focus:bg-muted focus:text-brand focus:**:text-brand"
              onSelect={() => setIsAddPhoneOpen(true)}
            >
              <Plus />
              Tambah nomor
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <AddPhoneNumberDialog
        businessName={waba.businessName ?? null}
        open={isAddPhoneOpen}
        trigger={null}
        wabaId={waba.wabaId}
        onOpenChange={setIsAddPhoneOpen}
      />
    </>
  );
}

function copyWabaId(wabaId: string) {
  void navigator.clipboard.writeText(wabaId);
  toast.success('WABA ID disalin.');
}

function WabaAccountRow({ waba }: { waba: Waba }) {
  const formattedDate = new Date(waba.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="grid gap-4 border-t border-border px-1 py-4 first:border-t-0 lg:grid-cols-4 lg:items-center lg:gap-0">
      <div className="min-w-0">
        <p className="truncate font-semibold text-brand">
          {waba.businessName || 'Bisnis tanpa nama'}
        </p>
        <button
          type="button"
          className="mt-1 flex max-w-full cursor-pointer items-center gap-1.5 text-xs font-medium text-brand transition hover:text-brand/80"
          onClick={() => copyWabaId(waba.wabaId)}
        >
          <span className="truncate">WABA ID: {waba.wabaId}</span>
          <Copy className="size-3.5 shrink-0" />
        </button>
      </div>

      <div className="min-w-0">
        <span className="mb-2 block text-xs font-semibold text-brand lg:hidden">
          Status
        </span>
        <StatusBadge status={waba.status} />
      </div>

      <div className="min-w-0">
        <span className="mb-2 block text-xs font-semibold text-brand lg:hidden">
          Nomor WhatsApp
        </span>
        <PhoneNumbersMenu waba={waba} />
      </div>

      <div className="min-w-0">
        <span className="mb-2 block text-xs font-semibold text-brand lg:hidden">
          Terhubung pada
        </span>
        <span className="text-sm font-semibold text-brand">
          {formattedDate}
        </span>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div>
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="grid gap-4 border-t border-border px-1 py-4 first:border-t-0 lg:grid-cols-4 lg:gap-0"
        >
          <div>
            <Skeleton className="mb-2 h-5 w-44" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-60 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-brand text-brand-foreground [&_svg]:size-6">
        <MessageSquare />
      </div>
      <div className="flex max-w-md flex-col gap-1">
        <p className="font-semibold text-brand">Belum ada akun WhatsApp</p>
        <p className="text-sm leading-relaxed text-brand">
          Hubungkan akun WhatsApp Business pertama agar pesan-ai bisa mulai
          menerima dan mengelola percakapan.
        </p>
      </div>
      <WabaEmbeddedSignupButton
        variant="brand"
        size="lg"
        idleLabel="Hubungkan akun WhatsApp"
        pendingLabel="Menghubungkan akun..."
      />
    </div>
  );
}

function StatusSummary({
  total,
  active,
  suspended,
}: {
  total: number;
  active: number;
  suspended: number;
}) {
  const items = [
    {
      label: 'akun',
      value: total,
      icon: FaWhatsapp,
      iconColor: 'text-brand',
      tone: 'text-brand',
    },
    {
      label: 'aktif',
      value: active,
      icon: CheckCircle2,
      iconColor: 'text-[oklch(0.46_0.13_155)]',
      tone: 'text-[oklch(0.46_0.13_155)]',
    },
    {
      label: 'perlu perhatian',
      value: suspended,
      icon: CircleAlert,
      iconColor: 'text-destructive',
      tone: 'text-destructive',
    },
  ];

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-x-6 gap-y-3 text-brand">
      {items.map((item) => (
        <div
          key={item.label}
          className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap"
        >
          <item.icon className={cn('size-6 shrink-0', item.iconColor)} />
          <span className={cn('text-base font-semibold', item.tone)}>
            {item.value}
          </span>
          <span className="text-base font-medium text-brand">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center gap-3 px-6 py-10 text-center text-destructive">
      <p className="text-sm">{message}</p>
      <Button
        variant="outline"
        size="sm"
        className="border-brand text-brand hover:bg-brand/90 hover:text-brand-foreground"
        onClick={onRetry}
      >
        <RefreshCw data-icon="inline-start" />
        Coba lagi
      </Button>
    </div>
  );
}

export function WabaDashboardManager() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, isPlaceholderData, refetch } =
    useWabas(page, PAGE_SIZE);
  const { data: overviewData } = useWabas(1, 100);

  const wabas = data?.wabas ?? [];
  const overviewWabas = overviewData?.wabas ?? wabas;
  const total = data?.total ?? 0;
  const overviewTotal = overviewData?.total ?? total;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;
  const activeWabas = overviewWabas.filter(
    (waba) => waba.status.toLowerCase() === 'active',
  ).length;
  const suspendedWabas = overviewWabas.filter(
    (waba) => waba.status.toLowerCase() === 'suspended',
  ).length;

  function renderList() {
    if (isLoading) {
      return <ListSkeleton />;
    }

    if (isError) {
      const message =
        error instanceof Error ? error.message : 'Gagal memuat daftar WABA';
      return <ErrorState message={message} onRetry={() => refetch()} />;
    }

    if (wabas.length === 0) {
      return <EmptyState />;
    }

    return wabas.map((waba) => <WabaAccountRow key={waba.id} waba={waba} />);
  }

  return (
    <>
      <FacebookSdkScript />

      <div className="flex min-h-0 flex-1 flex-col gap-10">
        <section>
          <div className="max-w-2xl">
            <h1 className="text-2xl leading-snug font-semibold tracking-tight text-brand sm:text-3xl">
              Akun WhatsApp Business
            </h1>
            <p className="mt-1 text-[0.9rem] leading-relaxed text-brand">
              Kelola akun dan nomor WhatsApp yang terhubung ke pesan-ai.
            </p>
          </div>
        </section>

        <section className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <StatusSummary
            total={overviewTotal}
            active={activeWabas}
            suspended={suspendedWabas}
          />
          <WabaEmbeddedSignupButton
            variant="brand"
            size="lg"
            className="w-full sm:w-auto"
            idleLabel="Hubungkan akun WhatsApp"
            pendingLabel="Menghubungkan akun..."
          />
        </section>

        <section
          className={cn(
            'flex min-h-0 flex-1 flex-col transition-opacity duration-200',
            isPlaceholderData && 'opacity-60',
          )}
        >
          <div className="min-h-0 flex-1 overflow-y-auto border-b border-border [scrollbar-gutter:stable]">
            <div className="sticky top-0 z-10 hidden border-b border-border bg-background px-1 py-3 text-xs font-semibold tracking-[0.12em] text-brand uppercase lg:grid lg:grid-cols-4">
              <span>Bisnis</span>
              <span>Status</span>
              <span className="inline-flex items-center gap-2">
                Nomor WhatsApp
                <FaWhatsapp className="size-3.5" />
              </span>
              <span>Terhubung pada</span>
            </div>
            <div>{renderList()}</div>
          </div>
        </section>
      </div>

      <div className="mt-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-brand">
          {total > 0
            ? `Menampilkan ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, total)} dari ${total} akun`
            : 'Belum ada akun'}
        </p>

        <div className="flex items-center gap-2">
          {canGoPrevious ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-brand hover:bg-muted hover:text-brand"
              onClick={() => setPage((prev) => prev - 1)}
            >
              <ChevronLeft data-icon="inline-start" />
              Sebelumnya
            </Button>
          ) : null}

          <span className="px-2 text-sm font-medium text-brand">
            Halaman {page} dari {totalPages}
          </span>

          {canGoNext ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-brand hover:bg-muted hover:text-brand"
              onClick={() => setPage((prev) => prev + 1)}
            >
              Berikutnya
              <ChevronRight data-icon="inline-end" />
            </Button>
          ) : null}
        </div>
      </div>
    </>
  );
}
