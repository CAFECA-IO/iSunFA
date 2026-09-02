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
  /**
   * Info: (20260828 - Luphia) `jspdf` 的 optional 相依 `canvg` 指到一個替身。
   *
   * Turbopack 在**建置期**解析 `jspdf` 內部的 `import("canvg")`，而 optional
   * 相依在冷安裝時可能不存在——症狀是「有 build cache 的建置綠、全新分支的
   * 第一次建置紅」，也就是每一條新分支的第一次 Vercel 建置都會失敗。
   *
   * **涵蓋範圍（when 子句）**：這個別名只在**以 Turbopack 建置時**生效。
   * Next 16 的 `next build` 預設走 Turbopack，所以現況是完整的；但 `--webpack`
   * 逃生口存在，走那條路時這個別名不會被套用，`canvg` 會回到「冷安裝時可能
   * 解不到」的狀態（review #6731 三輪低-5）。
   *
   * 用替身而不是把 `canvg` 升為直接相依：它只服務 `jsPDF.addSvgAsImage()`，
   * 而這個專案一次都沒有呼叫過（`pdf_export.ts` 只用 `addImage` /
   * `addPage` / `output`）。理由與替身本身寫在 `src/lib/stubs/canvg_unused.ts`。
   */
  turbopack: {
    resolveAlias: {
      canvg: "./src/lib/stubs/canvg_unused.ts",
    },
  },
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
