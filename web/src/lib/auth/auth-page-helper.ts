import { getLocaleFromHeaders } from '@/lib/i18n-helper/locale';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { auth } from './auth';

function redirectToLogin(requestHeaders: Headers): never {
  const locale = getLocaleFromHeaders(requestHeaders);

  redirect(`/${locale}/login?session_expired=true`);
}

/**
 * Centralized authentication helpers for page routes.
 */
export const AuthPageHelper = {
  async requireUser() {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });

    if (!session?.user) {
      redirectToLogin(requestHeaders);
    }

    return session.user;
  },

  async requireAdmin() {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });

    if (!session?.user || session.user.role !== 'admin') {
      notFound();
    }

    return session.user;
  },
};
