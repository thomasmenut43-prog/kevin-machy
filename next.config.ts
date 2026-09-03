import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  // Les images sont pré-encodées en AVIF/WebP/JPEG par scripts/build-images.mjs.
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
