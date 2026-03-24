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
    useSecureCookies: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  // disable sign-up using pre-hook if in production
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const isProduction =
        !process.env.ENVIRONMENT || process.env.ENVIRONMENT === 'production';

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
  plugins: [admin(), openAPI()],
});
