import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['fs', 'pdf-parse'],
};

export default nextConfig;
