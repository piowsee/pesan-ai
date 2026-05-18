import { WorkerPreset } from 'graphile-worker';

const preset: GraphileConfig.Preset = {
  extends: [WorkerPreset],
  worker: {
    connectionString: process.env.DATABASE_URL,
    maxPoolSize: 10,
    pollInterval: 2000,
    preparedStatements: true,
    schema: 'graphile_worker',
    crontabFile: 'crontab',
    concurrentJobs: 5,
    fileExtensions: ['.js', '.cjs', '.mjs', '.ts', '.cts', '.mts'],
  },
};

export default preset;
