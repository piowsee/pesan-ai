import { POST } from '@/app/api/admin/create-user/route';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { CreateUserService } from '@/services/create-user.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe(
  'Admin Create User API Route (/api/admin/create-user)',
  { tags: ['backend'] },
  () => {
    const url = 'http://localhost/api/admin/create-user';

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('returns 200 on successful user creation', async () => {
      vi.mocked(AuthHelper.requireAdmin).mockResolvedValue({
        id: 'admin-1',
        role: 'admin',
      } as never);
      vi.mocked(
        CreateUserService.createUserOrResendOnboarding,
      ).mockResolvedValue({
        message: 'User created and onboarding email sent successfully',
        user: {
          id: 'user-1',
          email: 'newuser@example.com',
        },
      } as never);

      const req = new Request(url, {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
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
      expect(data.data.message).toBe(
        'User created and onboarding email sent successfully',
      );
      expect(data.data.user).toEqual({
        id: 'user-1',
        email: 'newuser@example.com',
      });
      expect(
        CreateUserService.createUserOrResendOnboarding,
      ).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        name: 'New User',
        role: 'user',
      });
    });

    it('returns 200 on resend onboarding success', async () => {
      vi.mocked(AuthHelper.requireAdmin).mockResolvedValue({
        id: 'admin-1',
        role: 'admin',
      } as never);
      vi.mocked(
        CreateUserService.createUserOrResendOnboarding,
      ).mockResolvedValue({
        message: 'Onboarding email resent successfully',
      } as never);

      const req = new Request(url, {
        method: 'POST',
        body: JSON.stringify({
          email: 'pending@example.com',
          action: 'resend-onboarding',
        }),
      });

      const response = await POST(req, {
        params: Promise.resolve({}),
      } as never);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.data).toEqual({
        message: 'Onboarding email resent successfully',
      });
      expect(
        CreateUserService.createUserOrResendOnboarding,
      ).toHaveBeenCalledWith({
        email: 'pending@example.com',
        action: 'resend-onboarding',
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
      expect(data.data).toBeTruthy();
      expect(
        CreateUserService.createUserOrResendOnboarding,
      ).not.toHaveBeenCalled();
    });

    it('returns 500 when the service throws', async () => {
      vi.mocked(AuthHelper.requireAdmin).mockResolvedValue({
        id: 'admin-1',
        role: 'admin',
      } as never);
      vi.mocked(
        CreateUserService.createUserOrResendOnboarding,
      ).mockRejectedValue(new Error('Create user failed'));

      const req = new Request(url, {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
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
    });
  },
);
