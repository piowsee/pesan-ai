import { ApiError } from '@/lib/api-helper/error';
import { auth, createResetPasswordCallbackUrl } from '@/lib/auth/auth';
import { CreateUserPayload } from '@/schemas/create-user.schema';
import { headers } from 'next/headers';
import { randomBytes } from 'node:crypto';

type ExistingUser = {
  id: string;
  email: string;
  emailVerified: boolean;
};

export const CreateUserService = {
  _generateRandomPassword() {
    return randomBytes(24).toString('hex');
  },

  async _sendOnboardingEmail(email: string, userId: string) {
    const callbackURL = await createResetPasswordCallbackUrl(userId);

    auth.api.sendVerificationEmail({
      body: {
        email,
        callbackURL,
      },
    });
  },

  async findExistingUserByEmail(email: string): Promise<ExistingUser | null> {
    const requestHeaders = await headers();
    const userListResponse = await auth.api.listUsers({
      headers: requestHeaders,
      query: {
        limit: 1,
        searchField: 'email',
        searchOperator: 'contains',
        searchValue: email,
      },
    });

    const matchedUser = userListResponse.users.find(
      (user) => user.email === email,
    );

    if (!matchedUser) {
      return null;
    }

    const user = await auth.api.getUser({
      headers: requestHeaders,
      query: { id: matchedUser.id },
    });

    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
    };
  },

  async createUserOrResendOnboarding(body: CreateUserPayload) {
    const existingUser = await this.findExistingUserByEmail(body.email);

    if ('action' in body) {
      if (!existingUser) {
        throw new ApiError('User not found', 404);
      }

      if (existingUser.emailVerified) {
        throw new ApiError('User is already verified', 400);
      }

      await this._sendOnboardingEmail(existingUser.email, existingUser.id);

      return {
        message: 'Onboarding email resent successfully',
      };
    }

    if (existingUser) {
      throw new ApiError('User with that email already exists', 400);
    }

    const requestHeaders = await headers();
    const password = this._generateRandomPassword();
    const createUserResponse = await auth.api.createUser({
      body: {
        ...body,
        password,
      },
      headers: requestHeaders,
    });

    await this._sendOnboardingEmail(body.email, createUserResponse.user.id);

    return {
      message: 'User created and onboarding email sent successfully',
      user: createUserResponse.user,
    };
  },
};
