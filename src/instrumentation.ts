export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./lib/server/encryption');
  }
  await import('./lib/server/s3-client');
}
