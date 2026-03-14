import { headers } from 'next/headers';

import { auth } from './auth';

/**
 * Custom error class for authentication failures
 */
export class UnauthorizedError extends Error {
  status: number;
  constructor(message = 'Unauthorized access attempt detected', status = 401) {
    super(message);
    this.status = status;
    this.name = 'UnauthorizedError';
  }
}

/**
 * Centralized authentication helpers for API routes
 */
export const AuthHelper = {
  async requireUser() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || !session.user) {
      throw new UnauthorizedError();
    }

    return session.user;
  },

  async getUserId() {
    const user = await this.requireUser();
    return user.id;
  },
};
