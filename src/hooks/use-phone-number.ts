'use client';

import { extractJSendErrorMessage } from '@/lib/api-helper/error';
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { wabaKeys } from './use-wabas';

// ─── Types ───────────────────────────────────────────────────────────

export interface CreatePhoneNumberParams {
  wabaId: string;
  phoneNumber: string;
  name: string;
  countryCode?: string;
}

export interface RequestCodeParams {
  phoneNumberId: string;
  wabaId: string;
  codeMethod?: 'SMS' | 'VOICE';
  language?: string;
}

export interface VerifyCodeParams {
  phoneNumberId: string;
  wabaId: string;
  code: string;
}

export interface CustomerPhoneNumber {
  customerPhone: string;
  customerName: string | null;
}

export interface CustomerPhoneNumberFilters {
  wabaId?: string;
  phoneNumber?: string;
}

interface ListCustomerPhoneNumbersResponse {
  customerPhoneNumbers: CustomerPhoneNumber[];
  total: number;
}

export const phoneNumberKeys = {
  all: ['phoneNumbers'] as const,
  customerLists: () => [...phoneNumberKeys.all, 'customer-list'] as const,
  customerList: (filters: CustomerPhoneNumberFilters) =>
    [...phoneNumberKeys.customerLists(), filters] as const,
};

export const phoneNumberQueries = {
  customerList: (filters: CustomerPhoneNumberFilters = {}) =>
    queryOptions({
      queryKey: phoneNumberKeys.customerList(filters),
      queryFn: () => fetchCustomerPhoneNumbers(filters),
      staleTime: 60 * 1000,
      placeholderData: keepPreviousData,
    }),
};

// ─── API Functions ───────────────────────────────────────────────────

async function fetchCustomerPhoneNumbers(
  filters: CustomerPhoneNumberFilters = {},
): Promise<ListCustomerPhoneNumbersResponse> {
  const params = new URLSearchParams();

  if (filters.wabaId) {
    params.set('wabaId', filters.wabaId);
  }

  if (filters.phoneNumber) {
    params.set('phoneNumber', filters.phoneNumber);
  }

  const queryString = params.toString();
  const response = await fetch(
    queryString
      ? `/api/customer-phone-number?${queryString}`
      : '/api/customer-phone-number',
  );
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      extractJSendErrorMessage(body) || 'Failed to fetch customer numbers',
    );
  }

  const rows =
    (body?.data?.customerPhoneNumbers as CustomerPhoneNumber[] | undefined) ??
    [];

  return {
    customerPhoneNumbers: rows.map((row) => ({
      customerPhone: row.customerPhone,
      customerName: row.customerName ?? null,
    })),
    total: body?.data?.total ?? rows.length,
  };
}

async function createPhoneNumber(
  params: CreatePhoneNumberParams,
): Promise<{ phoneNumberId: string }> {
  const response = await fetch('/api/phone-number', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const errorMessage = body?.data?.message || body?.message;
    if (response.status === 502) {
      throw new Error(errorMessage || 'Meta API error');
    }
    throw new Error(errorMessage || 'Failed to create phone number');
  }

  const json = await response.json();
  return json.data;
}

async function requestCode(params: RequestCodeParams): Promise<void> {
  const response = await fetch('/api/phone-number/request-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const errorMessage = body?.data?.message || body?.message;
    if (response.status === 502) {
      throw new Error(errorMessage || 'Meta API error');
    }
    throw new Error(errorMessage || 'Failed to request verification code');
  }
}

async function verifyCode(params: VerifyCodeParams): Promise<void> {
  const response = await fetch('/api/phone-number/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const errorMessage = body?.data?.message || body?.message;
    if (response.status === 502) {
      throw new Error(errorMessage || 'Meta API error');
    }
    throw new Error(errorMessage || 'Failed to verify code');
  }
}

// ─── Hooks ───────────────────────────────────────────────────────────

export function useCustomerPhoneNumbers(
  filters: CustomerPhoneNumberFilters = {},
) {
  return useQuery(phoneNumberQueries.customerList(filters));
}

export function useCustomerPhoneNumberLists(
  filters: CustomerPhoneNumberFilters[],
) {
  const queries = useQueries({
    queries: filters.map((filter) => phoneNumberQueries.customerList(filter)),
  });
  const isLoading = queries.some((query) => query.isLoading);
  const isFetching = queries.some((query) => query.isFetching);
  const isError = queries.some((query) => query.isError);
  const error = queries.find((query) => query.error)?.error ?? null;

  const data = queries.reduce<ListCustomerPhoneNumbersResponse>(
    (acc, query) => {
      const rows = query.data?.customerPhoneNumbers ?? [];

      for (const row of rows) {
        const existingIndex = acc.customerPhoneNumbers.findIndex(
          (customer) => customer.customerPhone === row.customerPhone,
        );

        if (existingIndex === -1) {
          acc.customerPhoneNumbers.push(row);
          continue;
        }

        if (
          !acc.customerPhoneNumbers[existingIndex]?.customerName &&
          row.customerName
        ) {
          acc.customerPhoneNumbers[existingIndex] = row;
        }
      }

      acc.total = acc.customerPhoneNumbers.length;
      return acc;
    },
    { customerPhoneNumbers: [], total: 0 },
  );

  return {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}

export function useCreatePhoneNumber() {
  return useMutation({
    mutationFn: createPhoneNumber,
  });
}

export function useRequestVerificationCode() {
  return useMutation({
    mutationFn: requestCode,
  });
}

export function useVerifyAndRegisterPhoneNumber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: verifyCode,
    onSuccess: () => {
      // Invalidate the phone number fetch query on the WABA management page so the list refreshes
      queryClient.invalidateQueries({ queryKey: wabaKeys.all });
      queryClient.invalidateQueries({ queryKey: phoneNumberKeys.all });
    },
  });
}
