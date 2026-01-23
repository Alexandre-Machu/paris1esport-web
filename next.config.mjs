/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['react', 'react-dom']
  }
};

export default nextConfig;
