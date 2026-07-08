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
import { ChevronLeft, ChevronRight, Mail, Users } from 'lucide-react';
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
      <Badge variant={isAdmin ? 'default' : 'secondary'}>
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
      <TableRow>
        <TableCell className="font-medium">{user.name}</TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>
          <RoleBadge role={user.role} />
        </TableCell>
        <TableCell className="text-muted-foreground">{formattedDate}</TableCell>
        <TableCell>
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
          <TableRow key={index}>
            {TABLE_COLUMNS.map((column) => (
              <TableCell key={column}>
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
            <Users className="size-8 opacity-50" />
            <p className="text-sm">{t('empty.description')}</p>
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
            onClick={() => setPage((previousPage) => previousPage - 1)}
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
            onClick={() => setPage((previousPage) => previousPage + 1)}
          >
            {t('pagination.next')}
            <ChevronRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </div>
  );
}
