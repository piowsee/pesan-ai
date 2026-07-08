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
import { type CustomerContact } from '@/hooks/use-customer-contact';
import { cn } from '@/lib/utils';
import { RefreshCw, UserRound, UsersRound, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  PAGE_SIZE,
  getCustomerName,
  getCustomerPhone,
  getCustomerUsername,
} from './customers-utils';

function CustomersTableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <TableRow key={index} className="hover:bg-transparent">
          <TableCell className="w-16 py-4">
            <Skeleton className="h-5 w-8" />
          </TableCell>
          <TableCell className="min-w-64 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <Skeleton className="size-5 shrink-0" />
              <Skeleton className="h-5 w-48" />
            </div>
          </TableCell>
          <TableCell className="min-w-44 py-4">
            <Skeleton className="h-5 w-36" />
          </TableCell>
          <TableCell className="min-w-44 py-4">
            <Skeleton className="h-5 w-44" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function EmptyState({
  hasFilters,
  onClearFilters,
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  const t = useTranslations('Customers.empty');
  return (
    <div className="flex min-h-72 flex-col items-center justify-start gap-5 px-6 pt-8 pb-10 text-center">
      <UsersRound className="size-12 text-brand" />
      <div className="flex max-w-lg flex-col gap-2">
        <p className="text-xl font-semibold tracking-tight text-brand sm:text-2xl">
          {hasFilters ? t('filteredTitle') : t('title')}
        </p>
        <p className="text-sm leading-relaxed text-brand sm:text-base sm:leading-7">
          {hasFilters ? t('filteredDescription') : t('description')}
        </p>
      </div>
      {hasFilters ? (
        <Button
          variant="outline"
          size="lg"
          className="border-brand text-brand hover:bg-muted hover:text-brand"
          onClick={onClearFilters}
        >
          <X data-icon="inline-start" />
          {t('clearAction')}
        </Button>
      ) : null}
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
        className="border-brand text-brand hover:bg-muted hover:text-brand"
        onClick={onRetry}
      >
        <RefreshCw data-icon="inline-start" />
        {t('retry')}
      </Button>
    </div>
  );
}

export function CustomersTable({
  customers,
  pagedCustomers,
  page,
  isLoading,
  isError,
  error,
  isFetching,
  hasFilters,
  onClearFilters,
  onRetry,
}: {
  customers: CustomerContact[];
  pagedCustomers: CustomerContact[];
  page: number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isFetching: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
  onRetry: () => void;
}) {
  const t = useTranslations('Customers.table');
  const tError = useTranslations('Waba.error');
  if (isError) {
    const message = error instanceof Error ? error.message : tError('load');

    return <ErrorState message={message} onRetry={onRetry} />;
  }

  if (!isLoading && customers.length === 0) {
    return (
      <EmptyState hasFilters={hasFilters} onClearFilters={onClearFilters} />
    );
  }

  return (
    <section
      className={cn(
        'flex min-h-0 flex-1 flex-col transition-opacity duration-200',
        isFetching && !isLoading && 'opacity-70',
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto border-b border-border [scrollbar-gutter:stable]">
        <Table className="min-w-190">
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-16 text-xs font-semibold tracking-[0.12em] text-brand uppercase">
                {t('colNo')}
              </TableHead>
              <TableHead className="text-xs font-semibold tracking-[0.12em] text-brand uppercase">
                {t('colName')}
              </TableHead>
              <TableHead className="text-xs font-semibold tracking-[0.12em] text-brand uppercase">
                {t('colUsername')}
              </TableHead>
              <TableHead className="text-xs font-semibold tracking-[0.12em] text-brand uppercase">
                {t('colPhone')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <CustomersTableSkeleton />
            ) : (
              pagedCustomers.map((customer, index) => {
                const rowNumber = (page - 1) * PAGE_SIZE + index + 1;

                return (
                  <TableRow
                    key={`${customer.customerPhone ?? 'no-phone'}-${customer.customerUsername ?? 'no-username'}-${rowNumber}`}
                    className="hover:bg-transparent"
                  >
                    <TableCell className="w-16 py-4 text-sm font-medium text-brand/70">
                      {rowNumber}
                    </TableCell>
                    <TableCell className="min-w-64 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <UserRound className="size-5 shrink-0 text-brand" />
                        <p className="truncate text-sm font-semibold text-brand">
                          {getCustomerName(customer, t('noName'))}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-44 py-4 text-sm font-semibold text-brand">
                      {getCustomerUsername(customer, t('noUsername'))}
                    </TableCell>
                    <TableCell className="min-w-44 py-4 text-sm font-semibold text-brand">
                      {getCustomerPhone(customer, t('noPhone'))}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
