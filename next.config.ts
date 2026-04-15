import type { NextConfig } from "next";

// Info: (20260416 - Luphia) Overcome self-signed cert issues for local fetch/API by relaxing Node TLS globally in development
if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const nextConfig: NextConfig = {
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
    ],
  },
};

export default nextConfig;
