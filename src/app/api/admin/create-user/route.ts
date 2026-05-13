import { withApiAdmin } from '@/lib/api-handler';
import { auth } from '@/lib/auth/auth';
import { jsend } from '@/lib/jsend';
import { DEFAULT_LOCALE, toLocalePath } from '@/lib/locale';
import { headers } from 'next/headers';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(['user', 'admin']),
});

export const POST = withApiAdmin(async ({ req }) => {
  const body = createUserSchema.parse(await req.json());
  const requestHeaders = await headers();

  const createUserResponse = await auth.api.createUser({
    body,
    headers: requestHeaders,
  });

  // Use auth.api on the server instead of authClient.
  // authClient.sendVerificationEmail() runs under the current browser session,
  // and Better Auth checks that the session email matches the requested email.
  // For admin-created users, that causes EMAIL_MISMATCH.
  await auth.api.sendVerificationEmail({
    body: {
      email: body.email,
      callbackURL: toLocalePath(DEFAULT_LOCALE, '/reset-password'),
    },
  });

  return jsend.success(createUserResponse);
});
