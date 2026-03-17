import { headers } from 'next/headers';

import { auth } from './auth';

/**
 * Custom error class for API failures (4xx/5xx)
 */
export class ApiError extends Error {
  status: number;
  constructor(message = 'API request failed', status = 401) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

/**
 * Centralized authentication helpers for API routes
 */
export const AuthHelper = {
  async requireUser() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || !session.user) {
      throw new ApiError('Unauthorized access attempt detected', 401);
    }

    return session.user;
  },

  async getUserId() {
    const user = await this.requireUser();
    return user.id;
  },
};
