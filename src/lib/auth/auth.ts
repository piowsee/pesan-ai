import { getPathname } from '@/i18n/navigation';
import { EmailType, sendEmail } from '@/lib/auth/email/email';
import {
  type AppLocale,
  DEFAULT_LOCALE,
  getLocaleFromRequest,
} from '@/lib/locale';
import prisma from '@/lib/prisma';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { admin, openAPI } from 'better-auth/plugins';
import { randomBytes, randomUUID } from 'node:crypto';

const ADMIN_ONBOARDING_RESET_TOKEN_EXPIRES_IN = 3 * 24 * 60 * 60; // 3 days

export async function createResetPasswordCallbackUrl(
  userId: string,
  locale: AppLocale = DEFAULT_LOCALE,
) {
  const token = randomBytes(24).toString('hex');

  await prisma.verification.create({
    data: {
      id: randomUUID(),
      identifier: `reset-password:${token}`,
      value: userId,
      expiresAt: new Date(
        Date.now() + ADMIN_ONBOARDING_RESET_TOKEN_EXPIRES_IN * 1000,
      ),
    },
  });

  return getPathname({
    locale,
    href: {
      pathname: '/reset-password',
      query: { token },
    },
  });
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }, request) => {
      const locale = getLocaleFromRequest(request);
      const resetUrl = new URL(url);
      const resetCallbackURL = resetUrl.searchParams.get('callbackURL');

      if (!resetCallbackURL || resetCallbackURL === '/') {
        resetUrl.searchParams.set(
          'callbackURL',
          getPathname({ href: '/reset-password', locale }),
        );
      }

      void sendEmail({
        to: user.email,
        subject: 'Reset your password',
        type: EmailType.RESET_PASSWORD,
        params: {
          user_name: user.name || 'User',
          reset_url: resetUrl.toString(),
        },
      });
    },
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
  },
  // disable sign-up using pre-hook if in production
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const isProduction =
        !process.env.NODE_ENV || process.env.NODE_ENV === 'production';

      if (isProduction && ctx.path.startsWith('/sign-up')) {
        throw new APIError('BAD_REQUEST', {
          status: 'fail',
          data: {
            message: 'Endpoint not allowed',
          },
        });
      }
    }),
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }, request) => {
      const locale = getLocaleFromRequest(request);
      const verificationUrl = new URL(url);
      const verificationCallbackURL =
        verificationUrl.searchParams.get('callbackURL');

      if (!verificationCallbackURL || verificationCallbackURL === '/') {
        verificationUrl.searchParams.set(
          'callbackURL',
          getPathname({ href: '/reset-password', locale }),
        );
      }

      void sendEmail({
        to: user.email,
        subject: 'Verify your email address',
        type: EmailType.VERIFICATION,
        params: {
          user_name: user.name || 'User',
          verification_url: verificationUrl.toString(),
        },
      });
    },
    sendOnSignUp: true,
    /*
     * NOTE: Sign-in resends email & returns 403 if unverified.
     * @see https://better-auth.com/docs/concepts/email to use the built in onError
     */
    sendOnSignIn: true,
    expiresIn: 3 * 24 * 60 * 60, // 3 days
  },
  plugins: [admin(), openAPI()],
});
