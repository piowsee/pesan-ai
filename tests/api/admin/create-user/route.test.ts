import { POST } from '@/app/api/admin/create-user/route';
import { auth, createResetPasswordCallbackUrl } from '@/lib/auth/auth';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { headers } from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe(
  'Admin Create User API Route (/api/admin/create-user)',
  { tags: ['backend'] },
  () => {
    const url = 'http://localhost/api/admin/create-user';

    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(headers).mockResolvedValue(new Headers() as never);
    });

    it('returns 200 and sends verification email with reset-password callback on success', async () => {
      vi.mocked(AuthHelper.requireAdmin).mockResolvedValue({
        id: 'admin-1',
        role: 'admin',
      } as never);
      vi.mocked(auth.api.createUser).mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'newuser@example.com',
        },
      } as never);
      vi.mocked(createResetPasswordCallbackUrl).mockResolvedValue(
        '/en/reset-password?token=reset-token-123' as never,
      );
      vi.mocked(auth.api.sendVerificationEmail).mockResolvedValue({
        status: true,
      } as never);

      const req = new Request(url, {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
          role: 'user',
        }),
      });

      const response = await POST(req, {
        params: Promise.resolve({}),
      } as never);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.data.user).toEqual({
        id: 'user-1',
        email: 'newuser@example.com',
      });
      expect(auth.api.createUser).toHaveBeenCalledWith({
        body: {
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
          role: 'user',
        },
        headers: expect.any(Headers),
      });
      expect(createResetPasswordCallbackUrl).toHaveBeenCalledWith('user-1');
      expect(auth.api.sendVerificationEmail).toHaveBeenCalledWith({
        body: {
          email: 'newuser@example.com',
          callbackURL: '/en/reset-password?token=reset-token-123',
        },
      });
    });

    it('returns 400 when the request body is invalid', async () => {
      vi.mocked(AuthHelper.requireAdmin).mockResolvedValue({
        id: 'admin-1',
        role: 'admin',
      } as never);

      const req = new Request(url, {
        method: 'POST',
        body: JSON.stringify({
          email: 'not-an-email',
          name: '',
        }),
      });

      const response = await POST(req, {
        params: Promise.resolve({}),
      } as never);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.status).toBe('fail');
      expect(data.data.email).toBeDefined();
      expect(data.data.password).toBeDefined();
      expect(data.data.role).toBeDefined();
      expect(auth.api.createUser).not.toHaveBeenCalled();
      expect(auth.api.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('returns 500 when user creation fails', async () => {
      vi.mocked(AuthHelper.requireAdmin).mockResolvedValue({
        id: 'admin-1',
        role: 'admin',
      } as never);
      vi.mocked(auth.api.createUser).mockRejectedValue(
        new Error('Create user failed'),
      );

      const req = new Request(url, {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
          role: 'user',
        }),
      });

      const response = await POST(req, {
        params: Promise.resolve({}),
      } as never);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.status).toBe('error');
      expect(data.message).toBe('Create user failed');
      expect(createResetPasswordCallbackUrl).not.toHaveBeenCalled();
      expect(auth.api.sendVerificationEmail).not.toHaveBeenCalled();
    });
  },
);
