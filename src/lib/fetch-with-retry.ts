import { logError, logger } from '@/lib/logger';

const DEFAULT_FETCH_RETRY_COUNT = 3;
const DEFAULT_RETRY_DELAY_MS = 300;

export type RetryableFetchOptions = {
  action: string;
  retries?: number;
  retryDelayMs?: number;
  shouldRetryResponse?: (response: Response) => boolean;
};

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function shouldRetryMetaResponse(response: Response): boolean {
  return response.status === 429 || response.status >= 500;
}

export async function fetchWithRetry(
  input: string,
  init: RequestInit,
  options: RetryableFetchOptions,
): Promise<Response> {
  const {
    action,
    retries = DEFAULT_FETCH_RETRY_COUNT,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    shouldRetryResponse = shouldRetryMetaResponse,
  } = options;

  let attempt = 0;

  while (true) {
    try {
      const response = await fetch(input, init);

      if (attempt >= retries || !shouldRetryResponse(response)) {
        return response;
      }

      attempt += 1;
      logger.warn('Retrying request after retryable response', {
        action,
        attempt,
        status: response.status,
      });
    } catch (error) {
      if (attempt >= retries) {
        throw error;
      }

      attempt += 1;
      logError(error, {
        action,
        attempt,
        note: 'Retrying request after network failure',
      });
    }

    await sleep(retryDelayMs);
  }
}
