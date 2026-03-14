import prisma from '@/lib/prisma';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { admin, openAPI } from 'better-auth/plugins';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  // disable sign-up using pre-hook
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path.startsWith('/sign-up')) {
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
