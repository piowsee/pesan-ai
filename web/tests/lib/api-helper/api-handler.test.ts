import { withApiAdmin, withApiAuth } from '@/lib/api-helper/api-handler';
import { ApiError } from '@/lib/api-helper/error';
import { jsend } from '@/lib/api-helper/jsend';
import { AuthHelper } from '@/lib/auth/auth-api-helper';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

type RouteParams = {
  wabaId: string;
};

async function readBody<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

describe('api-handler wrappers', { tags: ['backend'] }, () => {
  const request = new Request('http://localhost/api/waba/waba-1', {
    method: 'GET',
  });
  const user = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'User One',
    role: 'user',
  };
  const admin = {
    ...user,
    role: 'admin',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes authenticated user, params, and request to the route handler', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue(user as never);

    const handler = vi.fn(async ({ params, user: routeUser }) =>
      jsend.success({
        userId: routeUser.id,
        wabaId: params.wabaId,
      }),
    );
    const route = withApiAuth<RouteParams>(handler);

    const response = await route(request, {
      params: Promise.resolve({ wabaId: 'waba-1' }),
    });

    expect(response.status).toBe(200);
    expect(await readBody(response)).toEqual({
      status: 'success',
      data: {
        userId: 'user-1',
        wabaId: 'waba-1',
      },
    });
    expect(handler).toHaveBeenCalledWith({
      user,
      params: { wabaId: 'waba-1' },
      req: request,
    });
  });

  it('uses admin authentication for admin routes', async () => {
    vi.mocked(AuthHelper.requireAdmin).mockResolvedValue(admin as never);

    const route = withApiAdmin<RouteParams>(async ({ user }) =>
      jsend.success({ role: user.role }),
    );

    const response = await route(request, {
      params: Promise.resolve({ wabaId: 'waba-1' }),
    });

    expect(await readBody(response)).toEqual({
      status: 'success',
      data: { role: 'admin' },
    });
  });

  it('maps ApiError to a JSend fail response', async () => {
    vi.mocked(AuthHelper.requireUser).mockRejectedValue(
      new ApiError('Unauthorized', 401),
    );

    const response = await withApiAuth<RouteParams>(async () =>
      jsend.success(null),
    )(request, {
      params: Promise.resolve({ wabaId: 'waba-1' }),
    });

    expect(response.status).toBe(401);
    expect(await readBody(response)).toEqual({
      status: 'fail',
      data: { message: 'Unauthorized' },
    });
  });

  it('maps ZodError field failures to a JSend fail response', async () => {
    vi.mocked(AuthHelper.requireUser).mockResolvedValue(user as never);

    const route = withApiAuth<RouteParams>(async () => {
      z.object({ name: z.string().min(2) }).parse({ name: '' });
      return jsend.success(null);
    });

    const response = await route(request, {
      params: Promise.resolve({ wabaId: 'waba-1' }),
    });

    expect(response.status).toBe(400);
    expect(await readBody(response)).toEqual({
      status: 'fail',
      data: {
        name: 'Too small: expected string to have >=2 characters',
      },
    });
  });
});
