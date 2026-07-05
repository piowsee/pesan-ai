'use client';

import { extractJSendErrorMessage } from '@/lib/api-helper/error';
import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';

export interface CustomerContact {
  customerPhone: string | null;
  customerName: string | null;
  customerUsername: string | null;
}

export interface CustomerContactFilters {
  wabaIds?: string[];
  phoneNumbers?: string[];
}

interface ListCustomerContactsResponse {
  customerContacts: CustomerContact[];
  total: number;
}

type CustomerContactQueryFilters = CustomerContactFilters | null;

const EMPTY_CUSTOMER_CONTACT_RESPONSE: ListCustomerContactsResponse = {
  customerContacts: [],
  total: 0,
};

function normalizeFilterValues(values?: string[]) {
  const normalized = Array.from(
    new Set(values?.map((value) => value.trim()).filter(Boolean) ?? []),
  ).sort();

  return normalized.length > 0 ? normalized : undefined;
}

function normalizeCustomerContactFilters(
  filters: CustomerContactQueryFilters = {},
): CustomerContactQueryFilters {
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

export const CustomerContactKeys = {
  all: ['CustomerContacts'] as const,
  lists: () => [...CustomerContactKeys.all, 'list'] as const,
  list: (filters: CustomerContactQueryFilters) =>
    [...CustomerContactKeys.lists(), filters ?? { disabled: true }] as const,
};

export const CustomerContactQueries = {
  list: (filters: CustomerContactQueryFilters = {}) => {
    const normalizedFilters = normalizeCustomerContactFilters(filters);

    return queryOptions({
      queryKey: CustomerContactKeys.list(normalizedFilters),
      queryFn: () => fetchCustomerContacts(normalizedFilters ?? {}),
      staleTime: 60 * 1000,
    });
  },
};

async function fetchCustomerContacts(
  filters: CustomerContactFilters = {},
): Promise<ListCustomerContactsResponse> {
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
      ? `/api/customer-contact?${queryString}`
      : '/api/customer-contact',
  );
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      extractJSendErrorMessage(body) || 'Failed to fetch customer contacts',
    );
  }

  const rows =
    (body?.data?.customerContacts as CustomerContact[] | undefined) ?? [];

  return {
    customerContacts: rows.map((row) => ({
      customerPhone: row.customerPhone ?? null,
      customerName: row.customerName ?? null,
      customerUsername: row.customerUsername ?? null,
    })),
    total: body?.data?.total ?? rows.length,
  };
}

export function useCustomerContacts(filters: CustomerContactQueryFilters = {}) {
  const shouldFetch = filters !== null;
  const query = useQuery({
    ...CustomerContactQueries.list(filters),
    enabled: shouldFetch,
    placeholderData: shouldFetch ? keepPreviousData : undefined,
  });

  return {
    ...query,
    data: shouldFetch
      ? (query.data ?? EMPTY_CUSTOMER_CONTACT_RESPONSE)
      : EMPTY_CUSTOMER_CONTACT_RESPONSE,
  };
}
