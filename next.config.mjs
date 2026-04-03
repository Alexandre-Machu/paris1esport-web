/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true
  },
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['react', 'react-dom'],
    // Allow larger multipart/form-data payloads (news and event uploads)
    proxyClientMaxBodySize: 50 * 1024 * 1024
  }
};

export default nextConfig;
