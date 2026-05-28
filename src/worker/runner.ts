import { logger } from '@/lib/logger';
import 'dotenv/config';
import { run } from 'graphile-worker';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to start the Graphile worker');
  }

  return connectionString;
}

async function startWorker() {
  const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
  const taskDirectory = path.resolve(currentDirectory, 'tasks');
  const runner = await run({
    connectionString: getConnectionString(),
    taskDirectory,
    schema: 'graphile_worker',
    concurrency: 5,
    pollInterval: 2000,
    maxPoolSize: 10,
  });

  logger.info('Graphile worker started', { taskDirectory });

  const shutdown = async (signal: string) => {
    logger.info('Stopping Graphile worker', { signal });
    await runner.stop();
    process.exit(0);
  };

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

void startWorker().catch((error) => {
  logger.error('Failed to start Graphile worker', { error });
  process.exit(1);
});
