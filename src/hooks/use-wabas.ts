'use client';

import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

// ─── Types ───────────────────────────────────────────────────────────

export interface WabaUser {
  id: string;
  name?: string | null;
  email?: string | null;
}

export interface WebhookBasic {
  id: string;
  name: string;
  webhookUrl: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface Waba {
  id: string;
  wabaId: string;
  businessName?: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  user?: WabaUser | null;
  assignedWebhook?: WebhookBasic | null;
  phoneNumbers: {
    id: string;
    displayPhoneNumber: string;
  }[];
}

interface ListWabasResponse {
  wabas: Waba[];
  total: number;
}

const DEFAULT_PAGE_SIZE = 10;

// ─── Query Keys ──────────────────────────────────────────────────────

export const wabaKeys = {
  all: ['admin', 'wabas'] as const,
  lists: () => [...wabaKeys.all, 'list'] as const,
  list: (page: number, limit: number) =>
    [...wabaKeys.lists(), { page, limit }] as const,
};

// ─── Query Options ───────────────────────────────────────────────────

export const wabaQueries = {
  list: (page: number, limit = DEFAULT_PAGE_SIZE) =>
    queryOptions({
      queryKey: wabaKeys.list(page, limit),
      queryFn: () => fetchWabas(page, limit),
      staleTime: 60 * 1000,
      placeholderData: keepPreviousData,
    }),
};

// ─── API Functions ───────────────────────────────────────────────────

async function fetchWabas(
  page: number,
  limit: number,
): Promise<ListWabasResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const response = await fetch(`/api/waba?${params.toString()}`);

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || 'Failed to fetch WABAs');
  }

  const json = await response.json();
  return {
    wabas:
      (
        json.data?.wabas as Array<
          Waba & { createdAt: string; updatedAt: string }
        >
      )?.map((w) => ({
        ...w,
        createdAt: new Date(w.createdAt),
        updatedAt: new Date(w.updatedAt),
      })) ?? [],
    total: json.data?.total ?? 0,
  };
}

async function assignWebhook({
  wabaId,
  webhookId,
}: {
  wabaId: string;
  webhookId: string | null;
}): Promise<void> {
  const response = await fetch(`/api/waba/${wabaId}/webhook`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ webhookId }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || 'Failed to assign webhook');
  }
}

// ─── Hooks ───────────────────────────────────────────────────────────

export function useWabas(page: number, limit = DEFAULT_PAGE_SIZE) {
  return useQuery(wabaQueries.list(page, limit));
}

export function useAssignWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: assignWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wabaKeys.all });
    },
  });
}
