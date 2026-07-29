import { S3Client } from '@aws-sdk/client-s3';

const globalForS3 = global as unknown as {
  s3Client: S3Client;
};

const s3Client =
  globalForS3.s3Client ||
  new S3Client({
    forcePathStyle: false,
    endpoint: process.env.BUCKET_ENDPOINT,
    // @see https://docs.digitalocean.com/products/spaces/reference/aws-sdks/
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.BUCKET_ACCESS_KEY ?? '',
      secretAccessKey: process.env.BUCKET_SECRET_KEY ?? '',
    },
  });

if (process.env.NODE_ENV !== 'production') globalForS3.s3Client = s3Client;

const s3BucketName = process.env.BUCKET_NAME as string;
const s3BucketPath = (process.env.BUCKET_PATH as string)?.replace(
  /^\/+|\/+$/g,
  '',
);

export { s3BucketName, s3BucketPath, s3Client };
