import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@lancedb/lancedb"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "isuncloud.com",
      },
      {
        protocol: "https",
        hostname: "storage.cafeca.io",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
  },
};

export default nextConfig;
