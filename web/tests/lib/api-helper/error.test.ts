import { ApiError, extractJSendErrorMessage } from '@/lib/api-helper/error';
import { describe, expect, it } from 'vitest';

describe('api-helper error utilities', { tags: ['backend'] }, () => {
  it('creates ApiError with defaults and custom status', () => {
    expect(new ApiError()).toMatchObject({
      name: 'ApiError',
      message: 'API request failed',
      status: 401,
    });

    expect(new ApiError('Forbidden', 403)).toMatchObject({
      name: 'ApiError',
      message: 'Forbidden',
      status: 403,
    });
  });

  it('extracts messages from JSend fail and error payloads', () => {
    expect(
      extractJSendErrorMessage({
        status: 'fail',
        data: { message: 'Validation failed' },
      }),
    ).toBe('Validation failed');

    expect(
      extractJSendErrorMessage({
        status: 'error',
        message: 'Internal error',
      }),
    ).toBe('Internal error');
  });

  it('returns null for non-error payloads', () => {
    expect(extractJSendErrorMessage(null)).toBeNull();
    expect(
      extractJSendErrorMessage({ status: 'success', data: null }),
    ).toBeNull();
    expect(extractJSendErrorMessage({ status: 'fail', data: {} })).toBeNull();
  });
});
