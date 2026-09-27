import { i18nClient } from '@better-auth/i18n/client';
import { adminClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  plugins: [adminClient(), i18nClient()],
});
