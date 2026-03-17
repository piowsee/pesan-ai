import { logError } from '@/logger/logger';

import { AuthHelper, UnauthorizedError } from './auth/auth-api-helper';
import { jsend } from './jsend';

type ApiHandler<T = unknown> = (
  userId: string,
  params: T,
  req: Request,
) => Promise<Response>;

/**
 * Higher-order function to wrap API routes with authentication and standardized error handling.
 * @param handler The actual route logic
 * @returns A Next.js API route handler
 */
export function withApiAuth<T = unknown>(handler: ApiHandler<T>) {
  return async (req: Request, { params }: { params: Promise<T> }) => {
    try {
      const userId = await AuthHelper.getUserId();
      const resolvedParams = await params;

      return await handler(userId, resolvedParams, req);
    } catch (err) {
      const action = req.method + ' ' + new URL(req.url).pathname;
      logError(err, { action });

      if (err instanceof UnauthorizedError) {
        return jsend.fail({ message: err.message }, 401);
      }

      return jsend.error(
        err instanceof Error ? err.message : 'Internal Server Error',
        500,
      );
    }
  };
}
