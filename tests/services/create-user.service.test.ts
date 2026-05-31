import { ApiError } from '@/lib/api-helper/error';
import { auth, createResetPasswordCallbackUrl } from '@/lib/auth/auth';
import { CreateUserService } from '@/services/create-user.service';
import { headers } from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/services/create-user.service');

describe('CreateUserService', { tags: ['backend'] }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(headers).mockResolvedValue(new Headers() as never);
  });

  describe('findExistingUserByEmail', () => {
    it('returns null when no matching user exists', async () => {
      vi.mocked(auth.api.listUsers).mockResolvedValue({
        users: [],
      } as never);

      const result = await CreateUserService.findExistingUserByEmail(
        'missing@example.com',
      );

      expect(result).toBeNull();
      expect(auth.api.getUser).not.toHaveBeenCalled();
    });

    it('returns the exact user from Better Auth', async () => {
      vi.mocked(auth.api.listUsers).mockResolvedValue({
        users: [
          {
            id: 'user-1',
            email: 'match@example.com',
          },
        ],
      } as never);
      vi.mocked(auth.api.getUser).mockResolvedValue({
        id: 'user-1',
        email: 'match@example.com',
        emailVerified: false,
      } as never);

      const result =
        await CreateUserService.findExistingUserByEmail('match@example.com');

      expect(auth.api.listUsers).toHaveBeenCalledWith({
        headers: expect.any(Headers),
        query: {
          limit: 1,
          searchField: 'email',
          searchOperator: 'contains',
          searchValue: 'match@example.com',
        },
      });
      expect(auth.api.getUser).toHaveBeenCalledWith({
        headers: expect.any(Headers),
        query: { id: 'user-1' },
      });
      expect(result).toEqual({
        id: 'user-1',
        email: 'match@example.com',
        emailVerified: false,
      });
    });
  });

  describe('createUserOrResendOnboarding', () => {
    it('creates a new user and sends onboarding email when no user exists', async () => {
      vi.mocked(auth.api.listUsers).mockResolvedValue({
        users: [],
      } as never);
      vi.mocked(auth.api.createUser).mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'new@example.com',
        },
      } as never);
      vi.mocked(createResetPasswordCallbackUrl).mockResolvedValue(
        '/en/reset-password?token=reset-token-123' as never,
      );
      vi.mocked(auth.api.sendVerificationEmail).mockResolvedValue({
        status: true,
      } as never);

      const result = await CreateUserService.createUserOrResendOnboarding({
        email: 'new@example.com',
        name: 'New User',
        role: 'user',
      });

      expect(auth.api.createUser).toHaveBeenCalledWith({
        body: {
          email: 'new@example.com',
          name: 'New User',
          password: expect.any(String),
          role: 'user',
        },
        headers: expect.any(Headers),
      });
      expect(createResetPasswordCallbackUrl).toHaveBeenCalledWith('user-1');
      expect(auth.api.sendVerificationEmail).toHaveBeenCalledWith({
        body: {
          email: 'new@example.com',
          callbackURL: '/en/reset-password?token=reset-token-123',
        },
      });
      expect(result).toEqual({
        message: 'User created and onboarding email sent successfully',
        user: {
          id: 'user-1',
          email: 'new@example.com',
        },
      });
    });

    it('resends onboarding when the user already exists but is unverified', async () => {
      vi.mocked(auth.api.listUsers).mockResolvedValue({
        users: [
          {
            id: 'user-2',
            email: 'pending@example.com',
          },
        ],
      } as never);
      vi.mocked(auth.api.getUser).mockResolvedValue({
        id: 'user-2',
        email: 'pending@example.com',
        emailVerified: false,
      } as never);
      vi.mocked(createResetPasswordCallbackUrl).mockResolvedValue(
        '/en/reset-password?token=reset-token-456' as never,
      );
      vi.mocked(auth.api.sendVerificationEmail).mockResolvedValue({
        status: true,
      } as never);

      const result = await CreateUserService.createUserOrResendOnboarding({
        email: 'pending@example.com',
        name: 'Pending User',
        role: 'user',
      });

      expect(auth.api.createUser).not.toHaveBeenCalled();
      expect(auth.api.sendVerificationEmail).toHaveBeenCalledWith({
        body: {
          email: 'pending@example.com',
          callbackURL: '/en/reset-password?token=reset-token-456',
        },
      });
      expect(result).toEqual({
        message: 'User already exists and onboarding email has been resent',
      });
    });

    it('resends onboarding through the resend action', async () => {
      vi.mocked(auth.api.listUsers).mockResolvedValue({
        users: [
          {
            id: 'user-3',
            email: 'resend@example.com',
          },
        ],
      } as never);
      vi.mocked(auth.api.getUser).mockResolvedValue({
        id: 'user-3',
        email: 'resend@example.com',
        emailVerified: false,
      } as never);
      vi.mocked(createResetPasswordCallbackUrl).mockResolvedValue(
        '/en/reset-password?token=reset-token-789' as never,
      );
      vi.mocked(auth.api.sendVerificationEmail).mockResolvedValue({
        status: true,
      } as never);

      const result = await CreateUserService.createUserOrResendOnboarding({
        email: 'resend@example.com',
        action: 'resend-onboarding',
      });

      expect(auth.api.createUser).not.toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Onboarding email resent successfully',
      });
    });

    it('generates a private random password for new users', async () => {
      vi.mocked(auth.api.listUsers).mockResolvedValue({
        users: [],
      } as never);
      vi.mocked(auth.api.createUser).mockResolvedValue({
        user: {
          id: 'user-5',
          email: 'secret@example.com',
        },
      } as never);
      vi.mocked(createResetPasswordCallbackUrl).mockResolvedValue(
        '/en/reset-password?token=reset-token-secret' as never,
      );
      vi.mocked(auth.api.sendVerificationEmail).mockResolvedValue({
        status: true,
      } as never);

      await CreateUserService.createUserOrResendOnboarding({
        email: 'secret@example.com',
        name: 'Secret User',
        role: 'admin',
      });

      const createUserCall = vi.mocked(auth.api.createUser).mock.calls[0]?.[0];

      expect(createUserCall?.body).toMatchObject({
        email: 'secret@example.com',
        name: 'Secret User',
        role: 'admin',
      });
      expect(createUserCall?.body.password).toEqual(expect.any(String));
      expect(createUserCall?.body.password).toHaveLength(48);
    });

    it('throws when resend is requested for a verified user', async () => {
      vi.mocked(auth.api.listUsers).mockResolvedValue({
        users: [
          {
            id: 'user-4',
            email: 'verified@example.com',
          },
        ],
      } as never);
      vi.mocked(auth.api.getUser).mockResolvedValue({
        id: 'user-4',
        email: 'verified@example.com',
        emailVerified: true,
      } as never);

      try {
        await CreateUserService.createUserOrResendOnboarding({
          email: 'verified@example.com',
          action: 'resend-onboarding',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({
          message: 'User is already verified',
          status: 400,
        });
      }
    });
  });
});
