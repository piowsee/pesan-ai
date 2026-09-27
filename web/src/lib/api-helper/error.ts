import type { JSendResponse } from './jsend';

/**
 * Custom error class for API failures (4xx/5xx)
 */
export class ApiError extends Error {
  status: number;
  constructor(message = 'API request failed', status = 401) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export function extractJSendErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const response = payload as JSendResponse<{ message?: string }>;

  if (response.status === 'error') {
    return response.message;
  }

  if (response.status === 'fail') {
    return response.data?.message ?? null;
  }

  return null;
}
