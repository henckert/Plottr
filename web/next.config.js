/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable SWR caching for API calls
  swcMinify: true,
  // Environment variables
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
  },
};

export default nextConfig;
