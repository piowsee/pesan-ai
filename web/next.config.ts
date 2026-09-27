import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'node:path';

const mediaHost = 'https://pesan-ai-object-storage.sgp1.digitaloceanspaces.com';

const nextConfig: NextConfig = {
  typescript: {
    tsconfigPath: 'tsconfig.build.json',
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `img-src 'self' data: blob: ${mediaHost}; media-src 'self' blob: ${mediaHost};`,
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pesan-ai-object-storage.sgp1.digitaloceanspaces.com',
        pathname: '/**',
      },
    ],
  },
  ...(process.env.DOCKER_BUILD === 'true' && {
    output: 'standalone',
    // In a pnpm monorepo the app lives in web/; pin file tracing to the repo
    // root so standalone output includes workspace deps deterministically.
    outputFileTracingRoot: path.join(process.cwd(), '..'),
  }),
};

const withNextIntl = createNextIntlPlugin({});
export default withNextIntl(nextConfig);
