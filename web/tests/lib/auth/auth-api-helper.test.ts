import { jsend } from '@/lib/api-helper/jsend';
import { describe, expect, it } from 'vitest';

async function readBody<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

describe('jsend response helper', { tags: ['backend'] }, () => {
  it('creates success responses with nullable data', async () => {
    const defaultResponse = jsend.success();
    const createdResponse = jsend.success({ id: 'resource-1' }, 201);

    expect(defaultResponse.status).toBe(200);
    await expect(readBody(defaultResponse)).resolves.toEqual({
      status: 'success',
      data: null,
    });

    expect(createdResponse.status).toBe(201);
    await expect(readBody(createdResponse)).resolves.toEqual({
      status: 'success',
      data: { id: 'resource-1' },
    });
  });

  it('creates fail and error responses with explicit statuses', async () => {
    const failResponse = jsend.fail({ message: 'Invalid request' }, 422);
    const errorResponse = jsend.error('Internal Server Error', 500);

    expect(failResponse.status).toBe(422);
    await expect(readBody(failResponse)).resolves.toEqual({
      status: 'fail',
      data: { message: 'Invalid request' },
    });

    expect(errorResponse.status).toBe(500);
    await expect(readBody(errorResponse)).resolves.toEqual({
      status: 'error',
      message: 'Internal Server Error',
    });
  });
});
