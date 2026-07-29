'use client';

import {
  keepPreviousData,
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

// ─── Types ───────────────────────────────────────────────────────────

export interface Webhook {
  id: string;
  name: string;
  webhookUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

interface ListWebhooksResponse {
  webhooks: Webhook[];
  total: number;
}

interface CreateWebhookPayload {
  name: string;
  webhookUrl: string;
  passphrase: string;
}

interface UpdateWebhookPayload {
  name?: string;
  webhookUrl?: string;
  passphrase?: string;
}

const DEFAULT_PAGE_SIZE = 10;

// ─── Query Keys ──────────────────────────────────────────────────────

export const webhookKeys = {
  all: ['admin', 'webhooks'] as const,
  lists: () => [...webhookKeys.all, 'list'] as const,
  list: (page: number, limit: number) =>
    [...webhookKeys.lists(), { page, limit }] as const,
};

// ─── Query Options ───────────────────────────────────────────────────

export const webhookQueries = {
  list: (page: number, limit = DEFAULT_PAGE_SIZE) =>
    queryOptions({
      queryKey: webhookKeys.list(page, limit),
      queryFn: () => fetchWebhooks(page, limit),
      staleTime: 60 * 1000, // 1 minute
      placeholderData: keepPreviousData,
    }),
  infiniteList: (limit = DEFAULT_PAGE_SIZE) => ({
    queryKey: [...webhookKeys.all, 'infinite', limit],
    queryFn: ({ pageParam = 1 }: { pageParam: number }) =>
      fetchWebhooks(pageParam, limit),
    initialPageParam: 1,
    getNextPageParam: (
      lastPage: ListWebhooksResponse,
      allPages: ListWebhooksResponse[],
    ) => {
      // Use total count to determine if there's a next page
      const fetchedSoFar = allPages.length * limit;
      return fetchedSoFar < lastPage.total ? allPages.length + 1 : undefined;
    },
  }),
};

// ─── API Functions ───────────────────────────────────────────────────

async function fetchWebhooks(
  page: number,
  limit: number,
): Promise<ListWebhooksResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const response = await fetch(`/api/webhooks?${params.toString()}`);

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.data?.message ?? 'Failed to fetch webhooks';
    throw new Error(message);
  }

  const json = await response.json();
  return {
    webhooks: json.data?.webhooks ?? [],
    total: json.data?.total ?? 0,
  };
}

async function createWebhook(payload: CreateWebhookPayload): Promise<void> {
  const response = await fetch('/api/webhooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.data?.message ?? 'Failed to create webhook';
    throw new Error(message);
  }
}

async function updateWebhook(params: {
  id: string;
  payload: UpdateWebhookPayload;
}): Promise<void> {
  const { id, payload } = params;
  const response = await fetch(`/api/webhooks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.data?.message ?? 'Failed to update webhook';
    throw new Error(message);
  }
}

async function deleteWebhook(id: string): Promise<void> {
  const response = await fetch(`/api/webhooks/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.data?.message ?? 'Failed to delete webhook';
    throw new Error(message);
  }
}

async function refreshWebhook(id: string): Promise<void> {
  const response = await fetch(`/api/webhooks/${id}/refresh`, {
    method: 'POST',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.data?.message ?? 'Failed to refresh webhook';
    throw new Error(message);
  }
}

// ─── Hooks ───────────────────────────────────────────────────────────

/**
 * Fetches a paginated list of webhooks for the admin panel.
 */
export function useWebhooks(page: number, limit = DEFAULT_PAGE_SIZE) {
  return useQuery(webhookQueries.list(page, limit));
}

/**
 * Mutation hook to create a new webhook.
 * Automatically invalidates the webhooks list on success.
 */
export function useCreateWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: webhookKeys.all,
      });
    },
  });
}

/**
 * Mutation hook to update a webhook (rename, change URL, refresh connection).
 * Automatically invalidates the webhooks list on success.
 */
export function useUpdateWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: webhookKeys.all,
      });
    },
  });
}

/**
 * Mutation hook to delete a webhook.
 * Automatically invalidates the webhooks list on success.
 */
export function useDeleteWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: webhookKeys.all,
      });
    },
  });
}

/**
 * Mutation hook to refresh a webhook's connection.
 */
export function useRefreshWebhook() {
  return useMutation({
    mutationFn: refreshWebhook,
  });
}

/**
 * Infinite query for select dropdowns.
 */
export function useInfiniteWebhooks(limit = 10) {
  return useInfiniteQuery(webhookQueries.infiniteList(limit));
}
