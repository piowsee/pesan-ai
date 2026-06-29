import { S3Client } from '@aws-sdk/client-s3';

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

const s3Client = new S3Client({
  forcePathStyle: false,
  endpoint: requiredEnv('DIGITAL_OCEAN_SPACES_BUCKET_ENDPOINT'),
  // @see https://docs.digitalocean.com/products/spaces/reference/aws-sdks/
  region: 'us-east-1',
  credentials: {
    accessKeyId: requiredEnv('DIGITAL_OCEAN_SPACES_BUCKET_ACCESS_KEY'),
    secretAccessKey: requiredEnv('DIGITAL_OCEAN_SPACES_BUCKET_SECRET_KEY'),
  },
});

export { s3Client };
