'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type Webhook, useWebhooks } from '@/hooks/use-webhooks';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Globe, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { DeleteWebhookDialog } from './delete-webhook-dialog';

const PAGE_SIZE = 10;

export function WebhookTable() {
  const t = useTranslations('Admin.WebhookTable');

  const TABLE_COLUMNS = [
    t('columns.name'),
    t('columns.url'),
    t('columns.status'),
    t('columns.createdAt'),
    t('columns.actions'),
  ];

  function StatusBadge({ isActive }: { isActive: boolean }) {
    return (
      <Badge variant={isActive ? 'default' : 'secondary'}>
        {isActive ? t('status.active') : t('status.inactive')}
      </Badge>
    );
  }

  function WebhookRow({ webhook }: { webhook: Webhook }) {
    const formattedDate = new Date(webhook.createdAt).toLocaleDateString(
      'en-US',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      },
    );

    return (
      <TableRow>
        <TableCell className="font-medium">{webhook.name}</TableCell>
        <TableCell className="max-w-[200px] truncate text-muted-foreground">
          {webhook.webhookUrl}
        </TableCell>
        <TableCell>
          <StatusBadge isActive={webhook.isActive} />
        </TableCell>
        <TableCell className="text-muted-foreground">{formattedDate}</TableCell>
        <TableCell>
          <DeleteWebhookDialog id={webhook.id} name={webhook.name} />
        </TableCell>
      </TableRow>
    );
  }

  function TableSkeleton() {
    return (
      <>
        {Array.from({ length: 5 }).map((_, index) => (
          <TableRow key={index}>
            {TABLE_COLUMNS.map((col) => (
              <TableCell key={col}>
                <Skeleton className="h-4 w-24" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </>
    );
  }

  function EmptyState() {
    return (
      <TableRow>
        <TableCell colSpan={TABLE_COLUMNS.length} className="h-40 text-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Globe className="size-8 opacity-50" />
            <p className="text-sm">{t('empty.description')}</p>
          </div>
        </TableCell>
      </TableRow>
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
      <TableRow>
        <TableCell colSpan={TABLE_COLUMNS.length} className="h-40 text-center">
          <div className="flex flex-col items-center gap-3 text-destructive">
            <p className="text-sm">{message}</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw data-icon="inline-start" />
              {t('error.retry')}
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, isPlaceholderData, refetch } =
    useWebhooks(page, PAGE_SIZE);

  const webhooks = data?.webhooks ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  function renderTableBody() {
    if (isLoading) return <TableSkeleton />;
    if (isError) {
      const message =
        error instanceof Error ? error.message : t('error.fallback');
      return <ErrorState message={message} onRetry={() => refetch()} />;
    }
    if (webhooks.length === 0) return <EmptyState />;

    return webhooks.map((webhook) => (
      <WebhookRow key={webhook.id} webhook={webhook} />
    ));
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          'overflow-hidden rounded-xl border transition-opacity duration-200',
          isPlaceholderData && 'opacity-50',
        )}
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {TABLE_COLUMNS.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>{renderTableBody()}</TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total > 0
            ? t('pagination.showing', {
                start: (page - 1) * PAGE_SIZE + 1,
                end: Math.min(page * PAGE_SIZE, total),
                total: total,
              })
            : t('pagination.empty')}
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!canGoPrevious}
            onClick={() => setPage((prev) => prev - 1)}
          >
            <ChevronLeft data-icon="inline-start" />
            {t('pagination.previous')}
          </Button>

          <span className="px-2 text-sm text-muted-foreground">
            {t('pagination.page', { current: page, total: totalPages })}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={!canGoNext}
            onClick={() => setPage((prev) => prev + 1)}
          >
            {t('pagination.next')}
            <ChevronRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </div>
  );
}
