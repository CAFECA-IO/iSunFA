import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'isuncloud.com',
      },
    ],
  },
};

export default nextConfig;
