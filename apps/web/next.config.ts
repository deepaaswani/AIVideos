import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@aivideos/contracts', '@aivideos/video'],
  poweredByHeader: false,
};

export default nextConfig;
