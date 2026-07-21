import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const mediaHost = 'https://pesan-ai-object-storage.sgp1.digitaloceanspaces.com';

const nextConfig: NextConfig = {
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
  output: 'standalone',
};

const withNextIntl = createNextIntlPlugin({});
export default withNextIntl(nextConfig);
