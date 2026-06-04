import * as fs from "fs";
import * as path from "path";
import puppeteer from "puppeteer";

export async function renderDppPdf(stockId: string, year: string = "2024") {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/${year}`);
  const baseDir = path.join(dataDir, "outputs", "e2e_roadmap-sprint1");
  const mockSourcesDir = path.join(baseDir, "mock_sources");
  const bomPath = path.join(mockSourcesDir, "boms_and_precursors.json");

  if (!fs.existsSync(bomPath)) {
    console.error(`❌ Missing BOM file: ${bomPath}`);
    process.exit(1);
  }

  const bomRaw = JSON.parse(fs.readFileSync(bomPath, "utf-8"));

  console.log(`🚀 [DPP PDF Renderer] 開始為 ${bomRaw.products.length} 項產品生成 Battery Pass 風格 PDF...`);

  for (const product of bomRaw.products) {
    const productId = product.productId;
    const productMockDir = path.join(baseDir, productId, "mock_sources");
    const productIngestionDir = path.join(baseDir, productId, "system_ingestion");
    if (!fs.existsSync(productIngestionDir)) fs.mkdirSync(productIngestionDir, { recursive: true });

    const groundTruthPath = path.join(productMockDir, `${productId}_dpp_ground_truth.json`);
    const outFile = path.join(productIngestionDir, `${productId}_dpp_ground_truth_dashboard.pdf`);

    if (!fs.existsSync(groundTruthPath)) {
      console.warn(`⚠️ [${productId}] 找不到對應的 Ground Truth JSON，跳過 PDF 產出。`);
      continue;
    }

    const dppData = JSON.parse(fs.readFileSync(groundTruthPath, "utf-8"));

    const blueprintPath = path.join(baseDir, "fastener_blueprint.png");
    let blueprintBase64 = "";
    if (fs.existsSync(blueprintPath)) {
      blueprintBase64 = fs.readFileSync(blueprintPath).toString("base64");
    }

    interface IRecycledMaterial {
      material: string;
      preConsumerShare: number;
      postConsumerShare: number;
      primaryMaterial: number;
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Inter', -apple-system, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px; margin: 0; }
    .header { border-bottom: 2px solid #334155; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { margin: 0; font-size: 32px; color: #f8fafc; display: flex; align-items: center; gap: 15px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; }
    .card h2 { font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-top: 0; border-bottom: 1px solid #334155; padding-bottom: 12px; margin-bottom: 20px; }
    .kv-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
    .kv-key { color: #cbd5e1; }
    .kv-val { color: #f8fafc; font-weight: 600; }
    .recycled-bar { height: 12px; border-radius: 6px; background: #334155; margin-top: 8px; display: flex; overflow: hidden; }
    .recycled-bar .pre { background: #3b82f6; }
    .recycled-bar .post { background: #10b981; }
    .recycled-bar .primary { background: #64748b; }
    .status-badge { background: #064e3b; color: #34d399; padding: 6px 12px; border-radius: 6px; font-size: 14px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Digital Product Passport <span class="status-badge">✔ VERIFIED</span></h1>
    <div style="color: #94a3b8; margin-top: 10px; font-family: monospace;">Passport ID: ${dppData.general.passportId}</div>
  </div>
  <div class="grid">
    <div class="card">
      <h2>General Information</h2>
      ${blueprintBase64 ? `<div style="text-align: center; margin-bottom: 15px;"><img src="data:image/png;base64,${blueprintBase64}" style="max-width: 100%; max-height: 200px; border-radius: 8px; border: 1px solid #334155;"></div>` : ""}
      <div class="kv-row"><span class="kv-key">Product Name</span><span class="kv-val">${dppData.general.name}</span></div>
      <div class="kv-row"><span class="kv-key">Model Number</span><span class="kv-val">${dppData.general.modelNumber}</span></div>
      <div class="kv-row"><span class="kv-key">Category</span><span class="kv-val">${dppData.general.category}</span></div>
      <div class="kv-row"><span class="kv-key">Weight</span><span class="kv-val">${dppData.general.weightKg} kg</span></div>
    </div>
    <div class="card">
      <h2>Carbon Footprint</h2>
      <div style="font-size: 42px; font-weight: bold; color: #10b981; text-align: center; margin: 25px 0;">
        ${dppData.carbonFootprint.total_tCO2e} <span style="font-size: 16px; color: #94a3b8;">tCO₂e</span>
      </div>
    </div>
  </div>
  <div class="card" style="margin-bottom: 30px;">
    <h2>Circularity</h2>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
      ${dppData.circularity.recycledContentShare.map((m: IRecycledMaterial) => `
        <div>
          <div class="kv-row"><span class="kv-key">${m.material}</span><span class="kv-val">Recycled: ${m.preConsumerShare + m.postConsumerShare}%</span></div>
          <div class="recycled-bar">
            <div class="pre" style="width: ${m.preConsumerShare}%"></div>
            <div class="post" style="width: ${m.postConsumerShare}%"></div>
            <div class="primary" style="width: ${m.primaryMaterial}%"></div>
          </div>
        </div>
      `).join("")}
    </div>
  </div>
</body>
</html>
    `;

    console.log(`⏳ [${productId}] 啟動 Puppeteer 渲染...`);
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "load" });

    await page.addStyleTag({
      content: `@page { size: A4; margin: 15mm; }`,
    });

    await page.pdf({
      path: outFile,
      format: "A4",
      printBackground: true,
      displayHeaderFooter: false,
    });

    await browser.close();
    console.log(`🎉 [SUCCESS] [${productId}] 數位產品護照 PDF 已成功產出：${outFile}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const stockId = process.argv[2];
  if (!stockId) {
    console.error("Usage: npx tsx render_dpp_pdf.ts <stockId>");
    process.exit(1);
  }
  renderDppPdf(stockId).catch(console.error);
}
