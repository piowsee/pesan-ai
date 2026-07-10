'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { type Waba, useWabas } from '@/hooks/use-wabas';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Copy,
  MessageSquare,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa6';
import { toast } from 'sonner';

import { AddPhoneNumberDialog } from './add-phone-number-dialog/add-phone-number-dialog';
import { FacebookSdkScript } from './facebook-sdk-script';
import { WabaEmbeddedSignupButton } from './waba-embedded-signup-button';

const PAGE_SIZE = 10;

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('Waba.status');
  const normalized = status.toLowerCase();

  if (normalized === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[oklch(0.46_0.13_155)]">
        {t('active')}
        <CheckCircle2 className="size-4 shrink-0" />
      </span>
    );
  }

  if (['disconnected', 'suspended'].includes(normalized)) {
    const label =
      normalized === 'disconnected' ? t('disconnected') : t('suspended');

    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-destructive">
        {label}
        <CircleAlert className="size-4 shrink-0" />
      </span>
    );
  }

  return <span className="text-sm font-semibold text-brand">{status}</span>;
}

function PhoneNumbersMenu({ waba }: { waba: Waba }) {
  const t = useTranslations('Waba.numbers');
  const [isAddPhoneOpen, setIsAddPhoneOpen] = useState(false);
  const phoneNumberCount = waba.phoneNumbers.length;
  const triggerLabel =
    phoneNumberCount === 1
      ? t('one')
      : t('multiple', { count: phoneNumberCount });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="unstyled"
            type="button"
            aria-label={t('manage')}
            className="inline-flex max-w-full cursor-pointer items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1.5 text-left text-sm font-medium text-brand transition hover:border-brand/30 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <FaWhatsapp className="size-3.5 shrink-0 text-[#25D366]" />
            <span className="truncate">{triggerLabel}</span>
            <ChevronDown className="size-3.5 shrink-0 text-brand/50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={8}
          className="w-72 rounded-lg border border-brand/20 p-0 shadow-lg"
        >
          <div className="flex items-center gap-3 px-4 py-4">
            <FaWhatsapp className="size-7 shrink-0 text-[#25D366]" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-brand">
                {t('whatsappNumber')}
              </p>
              <p className="truncate text-xs text-brand">
                {t('connected', { label: triggerLabel })}
              </p>
            </div>
          </div>

          <div className="px-4">
            <div className="h-px bg-brand/20" />
          </div>

          <div className="max-h-56 overflow-y-auto p-2 [scrollbar-gutter:stable]">
            {phoneNumberCount === 0 ? (
              <div className="px-2.5 py-2.5 text-sm leading-relaxed text-brand">
                {t('none')}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {waba.phoneNumbers.map((phoneNumber) => (
                  <div
                    key={phoneNumber.id}
                    className="rounded-md px-2.5 py-2.5 text-sm font-medium text-brand"
                  >
                    <span className="block truncate">
                      {phoneNumber.displayPhoneNumber}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-4">
            <div className="h-px bg-brand/20" />
          </div>

          <DropdownMenuGroup>
            <DropdownMenuItem
              className="m-2 cursor-pointer gap-3 rounded-md px-2.5 py-2.5 text-brand hover:bg-primary/5 focus:bg-primary/5 focus:text-brand focus:**:text-brand"
              onSelect={() => setIsAddPhoneOpen(true)}
            >
              <Plus />
              {t('add')}
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

function copyWabaId(wabaId: string, successMessage: string) {
  void navigator.clipboard.writeText(wabaId);
  toast.success(successMessage);
}

function WabaAccountRow({ waba }: { waba: Waba }) {
  const t = useTranslations('Waba');
  const formattedDate = new Date(waba.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="grid gap-4 border-t border-border px-1 py-4 first:border-t-0 lg:grid-cols-4 lg:items-center lg:gap-0">
      <div className="min-w-0">
        <p className="truncate font-semibold text-brand">
          {waba.businessName || t('row.unnamed')}
        </p>
        <Button
          variant="unstyled"
          type="button"
          className="mt-1 flex max-w-full cursor-pointer items-center gap-1.5 text-xs font-medium text-brand transition hover:text-brand/80"
          onClick={() => copyWabaId(waba.wabaId, t('id.copied'))}
        >
          <span className="truncate">
            {t('row.idPrefix')}
            {waba.wabaId}
          </span>
          <Copy className="size-3.5 shrink-0" />
        </Button>
      </div>

      <div className="min-w-0">
        <span className="mb-2 block text-xs font-semibold text-brand lg:hidden">
          {t('row.status')}
        </span>
        <StatusBadge status={waba.status} />
      </div>

      <div className="min-w-0">
        <span className="mb-2 block text-xs font-semibold text-brand lg:hidden">
          {t('numbers.whatsappNumber')}
        </span>
        <PhoneNumbersMenu waba={waba} />
      </div>

      <div className="min-w-0">
        <span className="mb-2 block text-xs font-semibold text-brand lg:hidden">
          {t('row.connectedOn')}
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

function EmptyState({
  onSignupSuccess,
}: {
  onSignupSuccess?: () => Promise<void> | void;
}) {
  const t = useTranslations('Waba');
  return (
    <div className="flex min-h-72 flex-col items-center justify-start gap-5 px-6 pt-8 pb-10 text-center">
      <MessageSquare className="size-12 text-brand" />
      <div className="flex max-w-lg flex-col gap-2">
        <p className="text-xl font-semibold tracking-tight text-brand sm:text-2xl">
          {t('empty.title')}
        </p>
        <p className="text-sm leading-relaxed text-brand sm:text-base sm:leading-7">
          {t('empty.description')}
        </p>
      </div>
      <WabaEmbeddedSignupButton
        variant="brand"
        size="lg"
        idleLabel={t('action.connect')}
        pendingLabel={t('action.connecting')}
        onSuccess={onSignupSuccess}
      />
    </div>
  );
}

function ConnectionLoader() {
  const t = useTranslations('Waba.action');

  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 py-10 text-center text-brand">
      <Spinner className="size-6 text-brand" />
      <p className="text-sm font-semibold">{t('connecting')}</p>
    </div>
  );
}

function StatusSummary({
  total,
  active,
  attention,
}: {
  total: number;
  active: number;
  attention: number;
}) {
  const t = useTranslations('Waba.summary');
  const items = [
    {
      label: t('accounts'),
      value: total,
      icon: FaWhatsapp,
      iconColor: 'text-brand',
      tone: 'text-brand',
    },
    {
      label: t('active'),
      value: active,
      icon: CheckCircle2,
      iconColor: 'text-[oklch(0.46_0.13_155)]',
      tone: 'text-[oklch(0.46_0.13_155)]',
    },
    {
      label: t('needsAttention'),
      value: attention,
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
  const t = useTranslations('Waba.error');
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
        {t('retry')}
      </Button>
    </div>
  );
}

export function WabaDashboardManager() {
  const t = useTranslations('Waba');
  const [page, setPage] = useState(1);
  const [isRefreshingAfterSignup, setIsRefreshingAfterSignup] = useState(false);
  const { data, isLoading, isError, error, isPlaceholderData, refetch } =
    useWabas(page, PAGE_SIZE);
  const { data: overviewData, refetch: refetchOverview } = useWabas(1, 100);

  const wabas = data?.wabas ?? [];
  const overviewWabas = overviewData?.wabas ?? wabas;
  const total = data?.total ?? 0;
  const overviewTotal = overviewData?.total ?? total;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isEmpty = !isLoading && !isError && total === 0;
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;
  const activeWabas = overviewWabas.filter(
    (waba) => waba.status.toLowerCase() === 'active',
  ).length;
  const attentionWabas = overviewWabas.filter((waba) =>
    ['disconnected', 'suspended'].includes(waba.status.toLowerCase()),
  ).length;

  async function refreshAfterSignup() {
    setIsRefreshingAfterSignup(true);
    try {
      await Promise.all([refetch(), refetchOverview()]);
    } finally {
      setIsRefreshingAfterSignup(false);
    }
  }

  function renderList() {
    if (isRefreshingAfterSignup) {
      return <ConnectionLoader />;
    }

    if (isLoading) {
      return <ListSkeleton />;
    }

    if (isError) {
      const message = error instanceof Error ? error.message : t('error.load');
      return <ErrorState message={message} onRetry={() => refetch()} />;
    }

    if (wabas.length === 0) {
      return <EmptyState onSignupSuccess={refreshAfterSignup} />;
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
              {t('header.title')}
            </h1>
            <p className="mt-1 text-[0.9rem] leading-relaxed text-brand">
              {t('header.description')}
            </p>
          </div>
        </section>

        <section className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <StatusSummary
            total={overviewTotal}
            active={activeWabas}
            attention={attentionWabas}
          />
          {!isEmpty ? (
            <WabaEmbeddedSignupButton
              variant="brand"
              size="lg"
              className="w-full sm:w-auto"
              idleLabel={t('action.connect')}
              pendingLabel={t('action.connecting')}
              onSuccess={refreshAfterSignup}
            />
          ) : null}
        </section>

        {isEmpty ? (
          <section className="flex min-h-0 flex-1 items-start justify-center">
            {isRefreshingAfterSignup ? (
              <ConnectionLoader />
            ) : (
              <EmptyState onSignupSuccess={refreshAfterSignup} />
            )}
          </section>
        ) : (
          <section
            className={cn(
              'flex min-h-0 flex-1 flex-col transition-opacity duration-200',
              isPlaceholderData && 'opacity-60',
            )}
          >
            <div className="min-h-0 flex-1 overflow-y-auto border-b border-border [scrollbar-gutter:stable]">
              <div className="sticky top-0 z-10 hidden border-b border-border bg-background px-1 py-3 text-xs font-semibold tracking-[0.12em] text-brand uppercase lg:grid lg:grid-cols-4">
                <span>{t('table.business')}</span>
                <span>{t('row.status')}</span>
                <span className="inline-flex items-center gap-2">
                  {t('numbers.whatsappNumber')}
                  <FaWhatsapp className="size-3.5" />
                </span>
                <span>{t('row.connectedOn')}</span>
              </div>
              <div>{renderList()}</div>
            </div>
          </section>
        )}
      </div>

      {!isEmpty ? (
        <div className="mt-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-brand">
            {total > 0
              ? t('pagination.showing', {
                  start: (page - 1) * PAGE_SIZE + 1,
                  end: Math.min(page * PAGE_SIZE, total),
                  total,
                })
              : t('pagination.empty')}
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
                {t('pagination.previous')}
              </Button>
            ) : null}

            <span className="px-2 text-sm font-medium text-brand">
              {t('pagination.page', { current: page, total: totalPages })}
            </span>

            {canGoNext ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-brand hover:bg-muted hover:text-brand"
                onClick={() => setPage((prev) => prev + 1)}
              >
                {t('pagination.next')}
                <ChevronRight data-icon="inline-end" />
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
