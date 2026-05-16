'use client';

import { authClient } from '@/lib/auth/auth-client';
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

// ─── Types ───────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  createdAt: Date;
}

interface ListUsersResponse {
  users: User[];
  total: number;
}

interface CreateUserPayload {
  email: string;
  name: string;
  role: 'user' | 'admin';
}

interface ResendUserOnboardingPayload {
  email: string;
  action: 'resend-onboarding';
}

interface UserMutationResponse {
  message?: string;
}

const DEFAULT_PAGE_SIZE = 10;

// ─── Query Keys ──────────────────────────────────────────────────────

export const userKeys = {
  all: ['admin', 'users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (page: number, limit: number) =>
    [...userKeys.lists(), { page, limit }] as const,
};

// ─── Query Options ───────────────────────────────────────────────────

export const userQueries = {
  list: (page: number, limit = DEFAULT_PAGE_SIZE) =>
    queryOptions({
      queryKey: userKeys.list(page, limit),
      queryFn: () => fetchUsers(page, limit),
      staleTime: 60 * 1000, // 1 minute
      placeholderData: keepPreviousData,
    }),
};

// ─── API Functions ───────────────────────────────────────────────────

async function fetchUsers(
  page: number,
  limit: number,
): Promise<ListUsersResponse> {
  const offset = (page - 1) * limit;

  const response = await authClient.admin.listUsers({
    query: { limit, offset },
  });

  if (response.error) {
    throw new Error(response.error.message ?? 'Failed to fetch users');
  }

  return {
    users: (response.data?.users ?? []) as User[],
    total: response.data?.total ?? 0,
  };
}

async function parseMutationResponse(
  response: Response,
): Promise<UserMutationResponse> {
  const payload = (await response.json().catch(() => null)) as {
    message?: string;
    data?: UserMutationResponse & { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(
      payload?.data?.message ?? payload?.message ?? 'Request failed',
    );
  }

  return payload?.data ?? {};
}

async function createUser(
  payload: CreateUserPayload,
): Promise<UserMutationResponse> {
  const response = await fetch('/api/admin/create-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseMutationResponse(response);
}

async function resendUserOnboarding(
  payload: ResendUserOnboardingPayload,
): Promise<UserMutationResponse> {
  const response = await fetch('/api/admin/create-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseMutationResponse(response);
}

// ─── Hooks ───────────────────────────────────────────────────────────

/**
 * Fetches a paginated list of users for the admin panel.
 */
export function useUsers(page: number, limit = DEFAULT_PAGE_SIZE) {
  return useQuery(userQueries.list(page, limit));
}

/**
 * Mutation hook to create a new user.
 * Automatically invalidates the users list on success.
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: userKeys.all,
      });
    },
  });
}

export function useResendUserOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resendUserOnboarding,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: userKeys.all,
      });
    },
  });
}
