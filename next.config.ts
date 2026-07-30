import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Info: (20260730 - Tzuhan) pdf-parse 須排除打包:它動態載入 pdfjs legacy build 與 @napi-rs/canvas(原生 .node),
  // Info: (20260730 - Tzuhan) 被 bundler 處理過就抽不出文字層,而失敗會靜默降級成視覺模型(逐字照抄變 AI 改寫)。
  serverExternalPackages: [
    "@lancedb/lancedb",
    "md-to-pdf",
    "puppeteer",
    "pdf-parse",
  ],
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
