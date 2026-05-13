import { EmailType, sendEmail } from '@/lib/auth/email/email';
import prisma from '@/lib/prisma';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { admin, openAPI } from 'better-auth/plugins';

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
    sendResetPassword: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: 'Reset your password',
        type: EmailType.RESET_PASSWORD,
        params: {
          user_name: user.name || 'User',
          reset_url: url,
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
    sendVerificationEmail: async ({ user, url }) => {
      const verificationUrl = new URL(url);
      verificationUrl.searchParams.set('callbackURL', '/login');
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
