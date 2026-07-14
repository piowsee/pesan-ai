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
import {
  type User,
  useResendUserOnboarding,
  useUsers,
} from '@/hooks/use-users';
import { cn } from '@/lib/utils';
import { Mail, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

const PAGE_SIZE = 10;

export function UserTable() {
  const t = useTranslations('Admin.UserTable');

  const TABLE_COLUMNS = [
    t('columns.name'),
    t('columns.email'),
    t('columns.role'),
    t('columns.createdAt'),
    t('columns.actions'),
  ];

  function RoleBadge({ role }: { role: string }) {
    const isAdmin = role === 'admin';

    return (
      <Badge
        className={cn(
          isAdmin
            ? 'border border-brand bg-transparent text-brand'
            : 'bg-brand text-brand-foreground',
        )}
      >
        {isAdmin ? t('roles.admin') : t('roles.user')}
      </Badge>
    );
  }

  function ResendOnboardingButton({
    email,
    isDisabled,
  }: {
    email: string;
    isDisabled: boolean;
  }) {
    const resendOnboarding = useResendUserOnboarding();

    if (isDisabled) {
      return null;
    }

    function handleResend() {
      resendOnboarding.mutate(
        { email, action: 'resend-onboarding' },
        {
          onSuccess: (result) => {
            toast.success(result.message ?? t('messages.resendSuccess'));
          },
          onError: (error) => {
            toast.error(
              error instanceof Error
                ? error.message
                : t('messages.resendError'),
            );
          },
        },
      );
    }

    return (
      <Button
        variant="outline"
        size="sm"
        className="border-brand/20 text-brand hover:bg-muted hover:text-brand"
        onClick={handleResend}
        disabled={resendOnboarding.isPending}
      >
        <Mail data-icon="inline-start" />
        {resendOnboarding.isPending
          ? t('actions.sending')
          : t('actions.resendInvite')}
      </Button>
    );
  }

  function UserRow({ user }: { user: User }) {
    const formattedDate = new Date(user.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    return (
      <TableRow className="hover:bg-transparent">
        <TableCell className="py-4 font-semibold text-brand">
          {user.name}
        </TableCell>
        <TableCell className="py-4 text-sm font-medium text-brand">
          {user.email}
        </TableCell>
        <TableCell className="py-4">
          <RoleBadge role={user.role} />
        </TableCell>
        <TableCell className="py-4 text-sm font-medium text-brand/70">
          {formattedDate}
        </TableCell>
        <TableCell className="py-4">
          <ResendOnboardingButton
            email={user.email}
            isDisabled={user.emailVerified}
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
            {TABLE_COLUMNS.map((column) => (
              <TableCell key={column} className="py-4">
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
            <Users className="size-10" />
            <p className="text-sm font-medium">{t('empty.description')}</p>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  function ErrorState({ message }: { message: string }) {
    return (
      <TableRow>
        <TableCell
          colSpan={TABLE_COLUMNS.length}
          className="h-40 text-center text-destructive"
        >
          {message}
        </TableCell>
      </TableRow>
    );
  }

  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, isPlaceholderData } = useUsers(
    page,
    PAGE_SIZE,
  );

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  function renderTableBody() {
    if (isLoading) {
      return <TableSkeleton />;
    }

    if (isError) {
      const message =
        error instanceof Error ? error.message : t('messages.errorFallback');
      return <ErrorState message={message} />;
    }

    if (users.length === 0) {
      return <EmptyState />;
    }

    return users.map((user) => <UserRow key={user.id} user={user} />);
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
                onClick={() => setPage((previousPage) => previousPage - 1)}
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
                onClick={() => setPage((previousPage) => previousPage + 1)}
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
