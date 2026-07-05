'use client';

import { Button } from '@/components/ui/button';
import {
  type CustomerContactFilters,
  useCustomerContacts,
} from '@/hooks/use-customer-contact';
import { useWabas } from '@/hooks/use-wabas';
import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { exportCustomersToExcel } from './customers-export';
import { CustomersFilters } from './customers-filters';
import { CustomersTable } from './customers-table';
import {
  EMPTY_CUSTOMERS,
  EMPTY_WABAS,
  PAGE_SIZE,
  type PhoneFilterOption,
  getWabaLabel,
  selectionLabel,
} from './customers-utils';

export function CustomersDashboard() {
  const [selectedWabaIds, setSelectedWabaIds] = useState<string[] | null>(null);
  const [selectedPhoneIds, setSelectedPhoneIds] = useState<string[] | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const { data: wabaData, isLoading: isWabaLoading } = useWabas(1, 100);
  const wabas = wabaData?.wabas ?? EMPTY_WABAS;
  const allWabaIds = useMemo(() => wabas.map((waba) => waba.id), [wabas]);
  const totalWabas = wabaData?.total ?? allWabaIds.length;
  const activeWabaIds = selectedWabaIds ?? allWabaIds;
  const selectedWabaCount =
    selectedWabaIds === null ? totalWabas : activeWabaIds.length;
  const activeWabaIdSet = useMemo(
    () => new Set(activeWabaIds),
    [activeWabaIds],
  );
  const phoneOptions = useMemo<PhoneFilterOption[]>(
    () =>
      wabas
        .filter((waba) => activeWabaIdSet.has(waba.id))
        .flatMap((waba) =>
          waba.phoneNumbers.map((phoneNumber) => ({
            id: phoneNumber.id,
            wabaId: waba.id,
            displayPhoneNumber: phoneNumber.displayPhoneNumber,
            wabaLabel: getWabaLabel(waba),
          })),
        ),
    [activeWabaIdSet, wabas],
  );
  const activePhoneOptions = useMemo(
    () =>
      selectedPhoneIds === null
        ? phoneOptions
        : phoneOptions.filter((phone) => selectedPhoneIds.includes(phone.id)),
    [phoneOptions, selectedPhoneIds],
  );
  const queryFilters = useMemo<CustomerContactFilters | null>(() => {
    const isAllWabas =
      selectedWabaIds === null || activeWabaIds.length === totalWabas;
    const isAllPhones =
      selectedPhoneIds === null ||
      activePhoneOptions.length === phoneOptions.length;

    if (selectedWabaIds !== null && activeWabaIds.length === 0) {
      return null;
    }

    if (selectedPhoneIds !== null && activePhoneOptions.length === 0) {
      return null;
    }

    const filters: CustomerContactFilters = {};

    if (!isAllWabas) {
      filters.wabaIds = activeWabaIds;
    }

    if (!isAllPhones) {
      filters.phoneNumbers = activePhoneOptions.map(
        (phone) => phone.displayPhoneNumber,
      );
    }

    return filters;
  }, [
    activePhoneOptions,
    activeWabaIds,
    phoneOptions.length,
    selectedPhoneIds,
    selectedWabaIds,
    totalWabas,
  ]);
  const { data, isLoading, isError, error, isFetching, refetch } =
    useCustomerContacts(queryFilters);
  const customers = data?.customerContacts ?? EMPTY_CUSTOMERS;
  const totalCustomers = data?.total ?? customers.length;
  const totalPages = Math.max(1, Math.ceil(totalCustomers / PAGE_SIZE));
  const pagedCustomers = customers.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const hasFilters = selectedWabaIds !== null || selectedPhoneIds !== null;
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;
  const wabaLabel = selectionLabel({
    total: totalWabas,
    selectedCount: selectedWabaCount,
    allLabel: 'All WABAs',
    emptyLabel: 'No WABA',
    singularLabel: 'WABA',
    pluralLabel: 'WABAs',
  });
  const numberLabel = selectionLabel({
    total: phoneOptions.length,
    selectedCount: activePhoneOptions.length,
    allLabel: 'All numbers',
    emptyLabel: 'No number',
    singularLabel: 'number',
    pluralLabel: 'numbers',
  });

  function clearFilters() {
    setSelectedWabaIds(null);
    setSelectedPhoneIds(null);
    setPage(1);
  }

  function toggleAllWabas(checked: boolean) {
    setSelectedWabaIds(checked ? null : []);
    setSelectedPhoneIds(null);
    setPage(1);
  }

  function toggleWaba(wabaId: string, checked: boolean) {
    const baseIds = selectedWabaIds ?? allWabaIds;
    const nextIds = checked
      ? [...baseIds, wabaId]
      : baseIds.filter((id) => id !== wabaId);
    const uniqueIds = Array.from(new Set(nextIds));

    setSelectedWabaIds(uniqueIds.length === totalWabas ? null : uniqueIds);
    setSelectedPhoneIds(null);
    setPage(1);
  }

  function toggleAllNumbers(checked: boolean) {
    setSelectedPhoneIds(checked ? null : []);
    setPage(1);
  }

  function toggleNumber(phoneId: string, checked: boolean) {
    const baseIds =
      selectedPhoneIds ?? phoneOptions.map((phoneNumber) => phoneNumber.id);
    const nextIds = checked
      ? [...baseIds, phoneId]
      : baseIds.filter((id) => id !== phoneId);
    const uniqueIds = Array.from(new Set(nextIds));

    setSelectedPhoneIds(
      uniqueIds.length === phoneOptions.length ? null : uniqueIds,
    );
    setPage(1);
  }

  function handleExport() {
    if (customers.length === 0) {
      toast.error('There are no customer rows to export.');
      return;
    }

    exportCustomersToExcel(customers);
    toast.success('Customer table exported.');
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8">
      <section>
        <div className="max-w-2xl">
          <h1 className="text-2xl leading-snug font-semibold tracking-tight text-brand sm:text-3xl">
            Customers
          </h1>
          <p className="mt-1 text-[0.9rem] leading-relaxed text-brand">
            Review customer numbers that have chatted with your connected
            WhatsApp accounts.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <CustomersFilters
          wabas={wabas}
          activeWabaIdSet={activeWabaIdSet}
          selectedWabaIds={selectedWabaIds}
          phoneOptions={phoneOptions}
          activePhoneOptions={activePhoneOptions}
          selectedPhoneIds={selectedPhoneIds}
          wabaLabel={wabaLabel}
          numberLabel={numberLabel}
          isWabaLoading={isWabaLoading}
          hasFilters={hasFilters}
          onToggleAllWabas={toggleAllWabas}
          onToggleWaba={toggleWaba}
          onToggleAllNumbers={toggleAllNumbers}
          onToggleNumber={toggleNumber}
          onClearFilters={clearFilters}
        />

        <Button
          variant="brand"
          size="lg"
          disabled={customers.length === 0 || isLoading || isError}
          onClick={handleExport}
        >
          <Download data-icon="inline-start" />
          Export Excel
        </Button>
      </section>

      <CustomersTable
        customers={customers}
        pagedCustomers={pagedCustomers}
        page={page}
        isLoading={isLoading}
        isError={isError}
        error={error}
        isFetching={isFetching}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
        onRetry={() => void refetch()}
      />

      {customers.length > 0 ? (
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-brand">
            Showing {(page - 1) * PAGE_SIZE + 1}-
            {Math.min(page * PAGE_SIZE, totalCustomers)} of {totalCustomers}{' '}
            customers
          </p>

          <div className="flex items-center gap-2">
            {canGoPrevious ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-brand hover:bg-muted hover:text-brand"
                onClick={() => setPage((prev) => prev - 1)}
              >
                Previous
              </Button>
            ) : null}

            <span className="px-2 text-sm font-medium text-brand">
              Page {page} of {totalPages}
            </span>

            {canGoNext ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-brand hover:bg-muted hover:text-brand"
                onClick={() => setPage((prev) => prev + 1)}
              >
                Next
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
