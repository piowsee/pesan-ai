'use client';

import { extractJSendErrorMessage } from '@/lib/api-helper/error';
import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';

export interface CustomerPhoneNumber {
  customerPhone: string | null;
  customerName: string | null;
  customerUsername: string | null;
}

export interface CustomerPhoneNumberFilters {
  wabaIds?: string[];
  phoneNumbers?: string[];
}

interface ListCustomerPhoneNumbersResponse {
  customerPhoneNumbers: CustomerPhoneNumber[];
  total: number;
}

type CustomerPhoneNumberQueryFilters = CustomerPhoneNumberFilters | null;

const EMPTY_CUSTOMER_PHONE_NUMBER_RESPONSE: ListCustomerPhoneNumbersResponse = {
  customerPhoneNumbers: [],
  total: 0,
};

function normalizeFilterValues(values?: string[]) {
  const normalized = Array.from(
    new Set(values?.map((value) => value.trim()).filter(Boolean) ?? []),
  ).sort();

  return normalized.length > 0 ? normalized : undefined;
}

function normalizeCustomerPhoneNumberFilters(
  filters: CustomerPhoneNumberQueryFilters = {},
): CustomerPhoneNumberQueryFilters {
  if (filters === null) {
    return null;
  }

  const wabaIds = normalizeFilterValues(filters.wabaIds);
  const phoneNumbers = normalizeFilterValues(filters.phoneNumbers);

  return {
    ...(wabaIds ? { wabaIds } : {}),
    ...(phoneNumbers ? { phoneNumbers } : {}),
  };
}

export const customerPhoneNumberKeys = {
  all: ['customerPhoneNumbers'] as const,
  lists: () => [...customerPhoneNumberKeys.all, 'list'] as const,
  list: (filters: CustomerPhoneNumberQueryFilters) =>
    [
      ...customerPhoneNumberKeys.lists(),
      filters ?? { disabled: true },
    ] as const,
};

export const customerPhoneNumberQueries = {
  list: (filters: CustomerPhoneNumberQueryFilters = {}) => {
    const normalizedFilters = normalizeCustomerPhoneNumberFilters(filters);

    return queryOptions({
      queryKey: customerPhoneNumberKeys.list(normalizedFilters),
      queryFn: () => fetchCustomerPhoneNumbers(normalizedFilters ?? {}),
      staleTime: 60 * 1000,
    });
  },
};

async function fetchCustomerPhoneNumbers(
  filters: CustomerPhoneNumberFilters = {},
): Promise<ListCustomerPhoneNumbersResponse> {
  const params = new URLSearchParams();

  for (const wabaId of filters.wabaIds ?? []) {
    params.append('wabaId', wabaId);
  }

  for (const phoneNumber of filters.phoneNumbers ?? []) {
    params.append('phoneNumber', phoneNumber);
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
      extractJSendErrorMessage(body) || 'Failed to fetch customers',
    );
  }

  const rows =
    (body?.data?.customerPhoneNumbers as CustomerPhoneNumber[] | undefined) ??
    [];

  return {
    customerPhoneNumbers: rows.map((row) => ({
      customerPhone: row.customerPhone ?? null,
      customerName: row.customerName ?? null,
      customerUsername: row.customerUsername ?? null,
    })),
    total: body?.data?.total ?? rows.length,
  };
}

export function useCustomerPhoneNumbers(
  filters: CustomerPhoneNumberQueryFilters = {},
) {
  const shouldFetch = filters !== null;
  const query = useQuery({
    ...customerPhoneNumberQueries.list(filters),
    enabled: shouldFetch,
    placeholderData: shouldFetch ? keepPreviousData : undefined,
  });

  return {
    ...query,
    data: shouldFetch
      ? (query.data ?? EMPTY_CUSTOMER_PHONE_NUMBER_RESPONSE)
      : EMPTY_CUSTOMER_PHONE_NUMBER_RESPONSE,
  };
}
