import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => {
  return {
    createVerification: vi.fn(),
    getPathname: vi.fn(
      ({
        locale,
        href,
      }: {
        locale: string;
        href: { pathname: string; query: Record<string, string> };
      }) => {
        const query = new URLSearchParams(href.query).toString();

        return `/${locale}${href.pathname}?${query}`;
      },
    ),
  };
});

vi.unmock('@/lib/auth/auth');

vi.mock('@/i18n/navigation', () => ({
  getPathname: authMocks.getPathname,
}));

vi.mock('@/lib/server/prisma', () => ({
  default: {
    verification: {
      create: authMocks.createVerification,
    },
  },
}));

vi.mock('better-auth', () => ({
  betterAuth: vi.fn(() => ({
    api: {},
  })),
}));

vi.mock('better-auth/adapters/prisma', () => ({
  prismaAdapter: vi.fn(() => ({
    provider: 'postgresql',
  })),
}));

vi.mock('better-auth/api', () => ({
  APIError: class APIError extends Error {
    constructor(code: string, payload: object) {
      super(code);
      Object.assign(this, payload);
    }
  },
  createAuthMiddleware: vi.fn((middleware) => middleware),
}));

vi.mock('better-auth/plugins', () => ({
  admin: vi.fn(() => ({ id: 'admin' })),
  openAPI: vi.fn(() => ({ id: 'open-api' })),
}));

vi.mock('@/lib/auth/auth-i18n', () => ({
  authI18n: { id: 'auth-i18n' },
}));

vi.mock('@/lib/auth/email/email', () => ({
  EmailType: {
    RESET_PASSWORD: 'reset-password',
    VERIFICATION: 'verification',
  },
  sendEmail: vi.fn(),
}));

describe('createResetPasswordCallbackUrl', { tags: ['backend'] }, () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-16T00:00:00.000Z'));
    authMocks.createVerification.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a reset-password token and returns it in the callback URL', async () => {
    const { createResetPasswordCallbackUrl } = await import('@/lib/auth/auth');

    const callbackUrl = await createResetPasswordCallbackUrl('user-1');
    const token = new URL(`https://app.test${callbackUrl}`).searchParams.get(
      'token',
    );

    expect(callbackUrl).toBe(`/en/reset-password?token=${token}`);
    expect(token).toMatch(/^[a-f0-9]{48}$/);
    expect(authMocks.getPathname).toHaveBeenCalledWith({
      locale: 'en',
      href: {
        pathname: '/reset-password',
        query: { token },
      },
    });
    expect(authMocks.createVerification).toHaveBeenCalledWith({
      data: {
        id: expect.any(String),
        identifier: `reset-password:${token}`,
        value: 'user-1',
        expiresAt: new Date('2026-06-19T00:00:00.000Z'),
      },
    });
  });
});
