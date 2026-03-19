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
import { type User, useUsers } from '@/hooks/use-users';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { useState } from 'react';

const PAGE_SIZE = 10;
const TABLE_COLUMNS = ['Name', 'Email', 'Role', 'Created At', 'Actions'];

// ─── Sub-components ──────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === 'admin';

  return (
    <Badge variant={isAdmin ? 'default' : 'secondary'}>
      {isAdmin ? 'Admin' : 'User'}
    </Badge>
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
      <TableCell>—</TableCell>
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
          <Users className="size-8 opacity-50" />
          <p className="text-sm">No users found.</p>
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

// ─── Main Component ──────────────────────────────────────────────────

export function UserTable() {
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
    if (isLoading) return <TableSkeleton />;
    if (isError) {
      const message =
        error instanceof Error ? error.message : 'An error occurred';
      return <ErrorState message={message} />;
    }
    if (users.length === 0) return <EmptyState />;

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

      {/* Pagination Controls */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total > 0
            ? `Showing ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, total)} of ${total} users`
            : 'No users'}
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!canGoPrevious}
            onClick={() => setPage((prev) => prev - 1)}
          >
            <ChevronLeft data-icon="inline-start" />
            Previous
          </Button>

          <span className="px-2 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={!canGoNext}
            onClick={() => setPage((prev) => prev + 1)}
          >
            Next
            <ChevronRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </div>
  );
}
