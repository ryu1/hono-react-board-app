import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Enable turbo for faster dev
  },
}

export default nextConfig