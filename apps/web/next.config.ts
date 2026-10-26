import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@aivideos/contracts'],
  poweredByHeader: false,
};

export default nextConfig;
