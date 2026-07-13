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
import { type Waba, useWabas } from '@/hooks/use-wabas';
import { cn } from '@/lib/utils';
import { MessageSquare, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { AssignWebhookDialog } from './assign-webhook-dialog';

const PAGE_SIZE = 10;

export function WabaTable() {
  const t = useTranslations('Admin.WabaTable');

  const TABLE_COLUMNS = [
    t('columns.namePhone'),
    t('columns.associatedUser'),
    t('columns.assignedWebhook'),
    t('columns.createdAt'),
    t('columns.actions'),
  ];

  function WebhookBadge({ webhook }: { webhook: Waba['assignedWebhook'] }) {
    if (!webhook) {
      return (
        <Badge className="border border-brand bg-transparent text-brand">
          {t('badges.none')}
        </Badge>
      );
    }
    return (
      <Badge className="bg-brand text-brand-foreground">{webhook.name}</Badge>
    );
  }

  function WabaRow({ waba }: { waba: Waba }) {
    const formattedDate = new Date(waba.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const phonesDisplay =
      waba.phoneNumbers.length > 0
        ? waba.phoneNumbers.map((pn) => pn.displayPhoneNumber).join(', ')
        : t('row.noPhoneNumbers');

    return (
      <TableRow className="hover:bg-transparent">
        <TableCell className="py-4 font-semibold text-brand">
          <div className="flex flex-col gap-1">
            <span>{waba.businessName || waba.wabaId}</span>
            <span className="text-xs font-medium text-brand/70">
              {phonesDisplay}
            </span>
          </div>
        </TableCell>
        <TableCell className="py-4">
          {waba.user ? (
            <div className="flex flex-col">
              <span className="font-semibold text-brand">
                {waba.user.name || t('row.unknownUser')}
              </span>
              <span className="text-xs font-medium text-brand/70">
                {waba.user.email}
              </span>
            </div>
          ) : (
            <span className="text-brand/60 italic">{t('row.none')}</span>
          )}
        </TableCell>
        <TableCell className="py-4">
          <WebhookBadge webhook={waba.assignedWebhook} />
        </TableCell>
        <TableCell className="py-4 text-sm font-medium text-brand/70">
          {formattedDate}
        </TableCell>
        <TableCell className="py-4">
          <AssignWebhookDialog
            wabaId={waba.id}
            wabaName={waba.businessName || waba.wabaId}
            currentWebhookId={waba.assignedWebhook?.id || null}
          />
        </TableCell>
      </TableRow>
    );
  }

  function TableSkeleton() {
    return (
      <>
        {Array.from({ length: 5 }).map((_, index) => (
          <TableRow key={index} className="hover:bg-transparent">
            {TABLE_COLUMNS.map((col) => (
              <TableCell key={col} className="py-4">
                <Skeleton className="h-5 w-24" />
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
          <div className="flex flex-col items-center gap-3 text-brand">
            <MessageSquare className="size-10" />
            <p className="text-sm font-medium">{t('empty.description')}</p>
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
            <Button
              variant="outline"
              size="sm"
              className="border-brand text-brand hover:bg-muted hover:text-brand"
              onClick={onRetry}
            >
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
    useWabas(page, PAGE_SIZE);

  const wabas = data?.wabas ?? [];
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
    if (wabas.length === 0) return <EmptyState />;

    return wabas.map((waba) => <WabaRow key={waba.id} waba={waba} />);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto border-b border-border transition-opacity duration-200 [scrollbar-gutter:stable]',
          isPlaceholderData && 'opacity-50',
        )}
      >
        <Table className="min-w-190">
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow className="hover:bg-transparent">
              {TABLE_COLUMNS.map((column) => (
                <TableHead
                  key={column}
                  className="text-xs font-semibold tracking-[0.12em] text-brand uppercase"
                >
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>{renderTableBody()}</TableBody>
        </Table>
      </div>

      {total > 0 ? (
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-brand">
            {t('pagination.showing', {
              start: (page - 1) * PAGE_SIZE + 1,
              end: Math.min(page * PAGE_SIZE, total),
              total: total,
            })}
          </p>

          <div className="flex items-center gap-2">
            {canGoPrevious ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-brand hover:bg-muted hover:text-brand"
                onClick={() => setPage((prev) => prev - 1)}
              >
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
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
