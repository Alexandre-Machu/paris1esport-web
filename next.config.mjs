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
  },
  async redirects() {
    return [
      {
        source: '/razer',
        destination: 'https://razer.a9yw.net/5kAMDo',
        permanent: false,
      },
      {
        source: '/discord',
        destination: 'https://discord.gg/R6vnHCm673',
        permanent: false,
      },
    ];
  }
};

export default nextConfig;
