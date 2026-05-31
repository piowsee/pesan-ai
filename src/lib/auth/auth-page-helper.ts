import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from './auth';

/**
 * Centralized authentication helpers for page routes.
 */
export const AuthPageHelper = {
  async requireUser() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return redirect('/login?session_expired=true');
    }

    return session.user;
  },

  async requireAdmin() {
    const user = await this.requireUser();

    if (user.role !== 'admin') {
      return redirect('/dashboard');
    }

    return user;
  },
};
