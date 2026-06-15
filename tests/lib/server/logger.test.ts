import { Prisma } from '@/generated/prisma/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/lib/server/logger');

describe('server logger helper', { tags: ['backend'] }, () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('logs standard Error instances with name and context', async () => {
    const { logError, logger } = await import('@/lib/server/logger');
    const errorSpy = vi.spyOn(logger, 'error').mockReturnValue(logger);

    logError(new Error('Database unavailable'), {
      action: 'load dashboard',
    });

    expect(errorSpy).toHaveBeenCalledWith('Database unavailable', {
      name: 'Error',
      action: 'load dashboard',
    });
  });

  it('logs non-error values as unknown errors', async () => {
    const { logError, logger } = await import('@/lib/server/logger');
    const errorSpy = vi.spyOn(logger, 'error').mockReturnValue(logger);

    logError('plain failure', {
      action: 'sync webhook',
    });

    expect(errorSpy).toHaveBeenCalledWith('Unknown error', {
      error: 'plain failure',
      action: 'sync webhook',
    });
  });

  it('truncates Prisma known request errors before logging them', async () => {
    vi.stubEnv('MAX_LOG_ERROR_MESSAGE_LENGTH', '12');
    const { logError, logger } = await import('@/lib/server/logger');
    const errorSpy = vi.spyOn(logger, 'error').mockReturnValue(logger);
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on a very long generated field name',
      {
        code: 'P2002',
        clientVersion: 'test-client-version',
      },
    );

    logError(prismaError, {
      action: 'create user',
    });

    expect(errorSpy).toHaveBeenCalledWith(
      'Prisma Error Occurred: Unique const...',
      {
        name: 'PrismaClientKnownRequestError',
        clientVersion: 'test-client-version',
        action: 'create user',
      },
    );
  });
});
