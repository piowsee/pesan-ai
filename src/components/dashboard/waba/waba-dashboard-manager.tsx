'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Phone,
  RefreshCw,
} from 'lucide-react';
import { useState } from 'react';

import { AddPhoneNumberDialog } from './add-phone-number-dialog/add-phone-number-dialog';
import { FacebookSdkScript } from './facebook-sdk-script';
import { WabaEmbeddedSignupButton } from './waba-embedded-signup-button';

const PAGE_SIZE = 10;
const TABLE_COLUMNS = [
  'Business',
  'Phone Numbers',
  'Status',
  'Connected At',
  'Actions',
];

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  if (normalized === 'active') {
    return <Badge className="bg-emerald-500/10 text-emerald-700">Active</Badge>;
  }

  if (normalized === 'suspended') {
    return (
      <Badge variant="destructive" className="border-0">
        Suspended
      </Badge>
    );
  }

  return <Badge variant="secondary">{status}</Badge>;
}

function PhoneNumbersDropdown({ waba }: { waba: Waba }) {
  if (waba.phoneNumbers.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">No phone numbers</span>
    );
  }

  const phoneNumberCount = waba.phoneNumbers.length;
  const triggerLabel =
    phoneNumberCount === 1
      ? '1 phone number'
      : `${phoneNumberCount} phone numbers`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="justify-between">
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Connected phone numbers</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {waba.phoneNumbers.map((phoneNumber) => (
          <DropdownMenuItem key={phoneNumber.id}>
            <Phone className="text-muted-foreground" />
            <span>{phoneNumber.displayPhoneNumber}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function WabaRow({ waba }: { waba: Waba }) {
  const formattedDate = new Date(waba.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex flex-col gap-1">
          <span>{waba.businessName || 'Unnamed business'}</span>
          <span className="text-xs text-muted-foreground">{waba.wabaId}</span>
        </div>
      </TableCell>
      <TableCell>
        <PhoneNumbersDropdown waba={waba} />
      </TableCell>
      <TableCell>
        <StatusBadge status={waba.status} />
      </TableCell>
      <TableCell className="text-muted-foreground">{formattedDate}</TableCell>
      <TableCell>
        <AddPhoneNumberDialog
          businessName={waba.businessName ?? null}
          wabaId={waba.wabaId}
        />
      </TableCell>
    </TableRow>
  );
}

function TableSkeleton() {
  return Array.from({ length: 5 }).map((_, index) => (
    <TableRow key={index}>
      {TABLE_COLUMNS.map((column) => (
        <TableCell key={column}>
          <Skeleton className="h-4 w-24" />
        </TableCell>
      ))}
    </TableRow>
  ));
}

function EmptyState() {
  return (
    <TableRow>
      <TableCell colSpan={TABLE_COLUMNS.length} className="h-44 text-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="rounded-full border border-dashed p-3">
            <MessageSquare className="size-6 opacity-70" />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              No WABAs connected yet
            </p>
            <p className="text-sm">
              No WhatsApp Business Account has been connected yet. Use the Add
              WhatsApp Account button to connect your first account.
            </p>
          </div>
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
      <TableCell colSpan={TABLE_COLUMNS.length} className="h-44 text-center">
        <div className="flex flex-col items-center gap-3 text-destructive">
          <p className="text-sm">{message}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw data-icon="inline-start" />
            Retry
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function WabaDashboardManager() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, isPlaceholderData, refetch } =
    useWabas(page, PAGE_SIZE);

  const wabas = data?.wabas ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  function renderBody() {
    if (isLoading) {
      return <TableSkeleton />;
    }

    if (isError) {
      const message =
        error instanceof Error ? error.message : 'Failed to load WABA list';
      return <ErrorState message={message} onRetry={() => refetch()} />;
    }

    if (wabas.length === 0) {
      return <EmptyState />;
    }

    return wabas.map((waba) => <WabaRow key={waba.id} waba={waba} />);
  }

  return (
    <>
      <FacebookSdkScript />

      <Card className="mt-6 gap-0">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <Badge variant="outline" className="w-fit">
                WABA Workspace
              </Badge>
              <div className="space-y-1">
                <CardTitle>Manage your WhatsApp Business Accounts</CardTitle>
              </div>
            </div>

            <CardAction className="col-auto row-auto self-auto justify-self-auto">
              <WabaEmbeddedSignupButton
                size="lg"
                idleLabel="Add WhatsApp Account"
                pendingLabel="Adding WhatsApp Account..."
              />
            </CardAction>
          </div>
        </CardHeader>

        <CardContent className="px-0">
          <div
            className={cn(
              'overflow-hidden transition-opacity duration-200',
              isPlaceholderData && 'opacity-60',
            )}
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  {TABLE_COLUMNS.map((column) => (
                    <TableHead key={column}>{column}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>{renderBody()}</TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {total > 0
            ? `Showing ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, total)} of ${total} WABAs`
            : 'No WABAs yet'}
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
    </>
  );
}
