/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['shared'], // if using shared package
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co', // For Supabase Storage
      },
    ],
  },
};

module.exports = nextConfig;
