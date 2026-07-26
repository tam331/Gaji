import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['pg'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3003'],
    },
  },
};

export default nextConfig;
