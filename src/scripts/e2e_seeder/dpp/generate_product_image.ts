import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { IProductBom } from "@/interfaces/cbam";

export async function generateProductImage(
  stockId: string,
  year: string = "2024",
  targetProductId?: string,
) {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/${year}`);
  const baseDir = path.join(dataDir, "outputs");
  const mockSourcesDir = path.join(baseDir, "mock_sources");

  const bomFile = path.join(mockSourcesDir, "boms_and_precursors.json");
  if (!fs.existsSync(bomFile)) {
    console.error(
      `❌ 找不到 BOM 檔案: ${bomFile}。請先執行 generate_bom_precursors.ts`,
    );
    process.exit(1);
  }

  const bomRaw = fs.readFileSync(bomFile, "utf-8");
  const bomData = JSON.parse(bomRaw);
  let products: IProductBom[] = bomData.products;

  if (targetProductId) {
    products = products.filter((p) => p.productId === targetProductId);
  }

  if (products.length === 0) {
    console.warn(`⚠️ [Imagen Generator] 找不到符合的產品，略過生成。`);
    return;
  }

  console.log(
    `🚀 [Imagen Generator] 開始為 ${stockId} 的 ${products.length} 項產品動態生成 Imagen 4.0 工程藍圖...`,
  );

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ 找不到 GEMINI_API_KEY 環境變數，無法執行 Imagen 4.0。");
    process.exit(1);
  }

  // Info: (20260610 - Tzuhan) 原始的靜態備用圖片路徑 (Fallback)
  const fallbackImagePath = path.join(baseDir, "fastener_blueprint.png");

  for (const product of products) {
    const productId = product.productId;
    const productName = product.productName || "Engineering Product";
    const productCategory = product.productCategory || "Automotive Component";

    const productMockDir = path.join(baseDir, productId, "mock_sources");
    if (!fs.existsSync(productMockDir)) {
      fs.mkdirSync(productMockDir, { recursive: true });
    }

    const imageOutPath = path.join(productMockDir, "fastener_blueprint.png");

    console.log(
      `⏳ [${productId}] 正在呼叫 Imagen 4.0 生成 ${productName} 的藍圖...`,
    );

    const prompt = `A highly detailed engineering mechanical blueprint of a ${productName} (${productCategory}), precise technical drawing, CAD wireframe style, modern dark tech theme with neon blue and cyan accents, extreme detail, top-down and isometric views.`;

    let success = false;

    // Info: (20260610 - Tzuhan) Retry 機制 (最多重試 2 次)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              instances: [{ prompt }],
              parameters: {
                sampleCount: 1,
                outputOptions: { mimeType: "image/png" },
              },
            }),
          },
        );

        const data = await response.json();

        if (
          response.ok &&
          data.predictions &&
          data.predictions[0]?.bytesBase64Encoded
        ) {
          const base64Data = data.predictions[0].bytesBase64Encoded;
          fs.writeFileSync(imageOutPath, Buffer.from(base64Data, "base64"));
          console.log(`✨ [SUCCESS] [${productId}] Imagen 4.0 繪圖完成！`);
          success = true;
          break;
        } else {
          console.warn(
            `⚠️ [${productId}] API 回應錯誤 (Attempt ${attempt}/2):`,
            data.error?.message || "Unknown error",
          );
          if (data.error?.code === 429) {
            console.warn(`⏳ Rate limit hit, waiting for 5 seconds...`);
            await new Promise((r) => setTimeout(r, 5000));
          } else {
            await new Promise((r) => setTimeout(r, 2000));
          }
        }
      } catch (error) {
        console.error(
          `⚠️ [${productId}] 網路請求失敗 (Attempt ${attempt}/2):`,
          error,
        );
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    // Info: (20260610 - Tzuhan) Fallback: 如果 Imagen 失敗，則複製靜態的圖片
    if (!success) {
      console.warn(
        `⚠️ [${productId}] Imagen 4.0 生成失敗，使用預設靜態藍圖做為備案 (Fallback)。`,
      );
      if (fs.existsSync(fallbackImagePath)) {
        fs.copyFileSync(fallbackImagePath, imageOutPath);
        console.log(`✅ [${productId}] 已成功套用靜態備案藍圖。`);
      } else {
        console.error(
          `❌ [${productId}] 找不到備案藍圖 (${fallbackImagePath})！`,
        );
      }
    }
  }
}

import url from "url";
const currentFilePath = url.fileURLToPath(import.meta.url);
if (
  process.argv[1] &&
  fs.realpathSync(process.argv[1]) === fs.realpathSync(currentFilePath)
) {
  const stockId = process.argv[2];
  if (!stockId) {
    console.error(
      "❌ 請提供股票代號，例如: npx tsx src/scripts/e2e_seeder/dpp/generate_product_image.ts 2066",
    );
    process.exit(1);
  }
  let productId: string | undefined;
  if (
    process.argv.length > 3 &&
    process.argv[3] &&
    !process.argv[3].startsWith("--")
  ) {
    // Info: (20260611 - Tzuhan) legacy compat
  }
  if (process.argv.length > 4 && process.argv[4].startsWith("--productId=")) {
    productId = process.argv[4].split("=")[1];
  }

  const year =
    process.argv[3] && !process.argv[3].startsWith("--")
      ? process.argv[3]
      : "2024";

  generateProductImage(stockId, year, productId).catch(console.error);
}
