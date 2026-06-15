import * as fs from "fs";
import * as path from "path";

export async function renderSpecsPdf(
  stockId: string,
  year: string = "2024",
  options?: { baseDirOverride?: string; targetProductId?: string },
) {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/${year}`);
  const baseDir = options?.baseDirOverride || path.join(dataDir, "outputs");
  const mockSourcesDir = path.join(baseDir, "mock_sources");
  const bomPath = path.join(mockSourcesDir, "boms_and_precursors.json");

  if (!fs.existsSync(bomPath)) {
    console.error(`❌ Missing BOM file: ${bomPath}`);
    return;
  }

  const bomRaw = JSON.parse(fs.readFileSync(bomPath, "utf-8"));

  console.log(
    `🚀 [Specs PDF Renderer] 開始為 ${bomRaw.products.length} 項產品生成 產品規格與技術手冊 PDF...`,
  );

  for (const product of bomRaw.products) {
    if (
      options?.targetProductId &&
      product.productId !== options.targetProductId
    )
      continue;
    const productId = product.productId;
    const productMockDir = path.join(baseDir, productId, "mock_sources");
    const productIngestionDir = path.join(
      baseDir,
      productId,
      "system_ingestion",
    );
    if (!fs.existsSync(productIngestionDir))
      fs.mkdirSync(productIngestionDir, { recursive: true });

    const specsPath = path.join(
      productMockDir,
      `${productId}_product_specs.json`,
    );
    const outFile = path.join(
      productIngestionDir,
      `${productId}_product_specs.pdf`,
    );

    if (!fs.existsSync(specsPath)) {
      console.warn(
        `⚠️ [${productId}] 找不到對應的 Specs JSON，跳過 PDF 產出。`,
      );
      continue;
    }

    const specsData = JSON.parse(fs.readFileSync(specsPath, "utf-8"));

    let blueprintPath = path.join(productMockDir, "fastener_blueprint.png");
    if (!fs.existsSync(blueprintPath)) {
      blueprintPath = path.join(baseDir, "fastener_blueprint.png");
    }
    let blueprintBase64 = "";
    if (fs.existsSync(blueprintPath)) {
      blueprintBase64 = fs.readFileSync(blueprintPath).toString("base64");
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', 'Noto Sans TC', -apple-system, sans-serif;
      background-color: #f8fafc;
      color: #1e293b;
      margin: 0;
      padding: 0;
      font-size: 14px;
      line-height: 1.6;
    }
    .page-container {
      background: #ffffff;
      padding: 40px;
    }
    .header {
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 16px;
      margin-bottom: 30px;
    }
    .title {
      font-size: 28px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 8px 0;
    }
    .subtitle {
      font-size: 16px;
      color: #64748b;
      font-weight: 500;
      margin: 0;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 16px 0;
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: #f1f5f9;
      padding: 8px 12px;
      border-radius: 6px;
      border-left: 4px solid #3b82f6;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      background-color: #ffffff;
    }
    .kv-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .kv-row:last-child {
      border-bottom: none;
    }
    .kv-key {
      color: #64748b;
      font-weight: 500;
    }
    .kv-val {
      color: #0f172a;
      font-weight: 600;
      text-align: right;
    }
    .text-block {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 16px;
      border-radius: 6px;
      color: #334155;
    }
    .tag-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }
    .tag {
      background-color: #dbeafe;
      color: #1d4ed8;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .blueprint-img {
      width: 100%;
      max-height: 250px;
      object-fit: contain;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 8px;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="header">
      <h1 class="title">產品規格與技術手冊</h1>
      <p class="subtitle">${specsData.productName} (SKU: ${specsData.productId})</p>
    </div>

    <div class="section">
      <h2 class="section-title">📘 產品設計與概覽</h2>
      ${blueprintBase64 ? `<img src="data:image/png;base64,${blueprintBase64}" class="blueprint-img" alt="Blueprint"/>` : ""}
      <div class="text-block">
        這是本產品的官方技術與操作規格指南，包含產品的耐久性、維修政策與報廢處置指引。
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">🛡️ 耐用性與操作條件 (Durability & Operations)</h2>
      <div class="grid">
        <div class="card">
          <div class="kv-row">
            <span class="kv-key">物理壽命預期 (年)</span>
            <span class="kv-val">${specsData.durability?.physicalLifespanYears || "N/A"}</span>
          </div>
          <div class="kv-row">
            <span class="kv-key">最大操作溫度</span>
            <span class="kv-val">${specsData.durability?.maxOperatingTemperature_C || "N/A"} °C</span>
          </div>
        </div>
      </div>
      <div style="margin-top: 12px;" class="text-block">
        <strong>操作條件：</strong><br/>
        ${specsData.durability?.operatingConditions || "N/A"}
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">🔧 維修與拆卸指引 (Repair & Teardown)</h2>
      <div class="grid">
        <div class="card">
          <div class="kv-row">
            <span class="kv-key">是否可修復</span>
            <span class="kv-val">${specsData.repairAndTeardown?.isRepairable ? "是 (Yes)" : "否 (No)"}</span>
          </div>
          <div class="kv-row">
            <span class="kv-key">是否需特殊工具</span>
            <span class="kv-val">${specsData.repairAndTeardown?.requiresSpecialTools ? "是 (Yes)" : "否 (No)"}</span>
          </div>
          <div class="kv-row">
            <span class="kv-key">拆卸難易度</span>
            <span class="kv-val">${specsData.repairAndTeardown?.teardownEffort || "N/A"}</span>
          </div>
        </div>
      </div>
      <div style="margin-top: 12px;">
        <span class="kv-key">指定維修工具：</span>
        <div class="tag-container">
          ${specsData.repairAndTeardown?.toolList?.map((t: string) => `<span class="tag">${t}</span>`).join("") || "<span class='tag'>N/A</span>"}
        </div>
      </div>
      <div style="margin-top: 12px;" class="text-block">
        <strong>拆裝指引：</strong><br/>
        ${specsData.repairAndTeardown?.guidelines || "N/A"}
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">♻️ 報廢處置與回收 (Disposal & Recycling)</h2>
      <div class="grid">
        <div class="card">
          <div class="kv-row">
            <span class="kv-key">可回收率</span>
            <span class="kv-val">${specsData.disposal?.recyclabilityRate_percent || "0"}%</span>
          </div>
          <div class="kv-row">
            <span class="kv-key">處置方式</span>
            <span class="kv-val">${specsData.disposal?.disposalMethod || "N/A"}</span>
          </div>
        </div>
      </div>
      <div style="margin-top: 12px;" class="text-block">
        <strong>報廢與回收說明：</strong><br/>
        ${specsData.disposal?.instructions || "N/A"}
      </div>
    </div>
  </div>
</body>
</html>
    `;

    try {
      const { mdToPdf } = await import("md-to-pdf");
      const pdf = await mdToPdf(
        { content: htmlContent },
        {
          pdf_options: {
            format: "a4",
            margin: { top: "0", right: "0", bottom: "0", left: "0" },
            printBackground: true,
          },
        },
      );
      if (pdf) {
        fs.writeFileSync(outFile, pdf.content);
        console.log(`✅ [${productId}] 生成 PDF 完成: ${outFile}`);
      }
    } catch (err) {
      console.error(`❌ [${productId}] 生成 PDF 失敗:`, err);
    }
  }
}

// Info: (20260615 - Tzuhan) Support direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const stockId = process.argv[2];
  const year = process.argv[3];
  if (!stockId || !year) {
    console.error("Usage: ts-node render_specs_pdf.ts <stockId> <year>");
    process.exit(1);
  }
  renderSpecsPdf(stockId, year)
    .then(() => {
      console.log("Done.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error:", err);
      process.exit(1);
    });
}
