import { auth } from '@/lib/auth/auth';
import { AuthPageHelper } from '@/lib/auth/auth-page-helper';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('AuthPageHelper', () => {
  beforeEach(() => {
    vi.mocked(headers).mockResolvedValue(new Headers());
  });

  it('returns the signed-in user', async () => {
    const user = {
      id: 'user-1',
      email: 'user@example.com',
      name: 'User One',
      role: 'user',
    };

    vi.mocked(auth.api.getSession).mockResolvedValue({ user } as never);

    await expect(AuthPageHelper.requireUser()).resolves.toEqual(user);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('redirects guests to the login page', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as never);
    vi.mocked(headers).mockResolvedValue(
      new Headers({
        referer: 'http://localhost/id/forgot-password',
        host: 'localhost',
        'x-forwarded-proto': 'http',
      }) as never,
    );
    vi.mocked(redirect).mockImplementation((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    });

    await expect(AuthPageHelper.requireUser()).rejects.toThrow(
      'REDIRECT:/id/login?session_expired=true',
    );
  });

  it('falls back to the default locale when no locale can be detected', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as never);
    vi.mocked(headers).mockResolvedValue(new Headers() as never);
    vi.mocked(redirect).mockImplementation((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    });

    await expect(AuthPageHelper.requireUser()).rejects.toThrow(
      'REDIRECT:/en/login?session_expired=true',
    );
  });

  it('redirects non-admin users to the dashboard', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User One',
        role: 'user',
      },
    } as never);
    vi.mocked(redirect).mockImplementation((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    });

    await expect(AuthPageHelper.requireAdmin()).rejects.toThrow(
      'REDIRECT:/dashboard',
    );
  });

  it('returns the admin user', async () => {
    const adminUser = {
      id: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin One',
      role: 'admin',
    };

    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: adminUser,
    } as never);

    await expect(AuthPageHelper.requireAdmin()).resolves.toEqual(adminUser);
  });
});
