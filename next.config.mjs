/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true
  },
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['react', 'react-dom'],
    // Allow larger multipart/form-data payloads (event photo uploads)
    proxyClientMaxBodySize: 10 * 1024 * 1024
  }
};

export default nextConfig;
