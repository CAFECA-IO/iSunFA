import * as fs from "fs";
import * as path from "path";

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

    let blueprintPath = path.join(productMockDir, "fastener_blueprint.png");
    if (!fs.existsSync(blueprintPath)) {
      blueprintPath = path.join(baseDir, "fastener_blueprint.png");
    }
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

    interface IChemicalElement {
      element: string;
      percentage: number;
    }

    interface IMaterialComposition {
      materialName: string;
      elements: IChemicalElement[];
    }

    const tCO2e = dppData.carbonFootprint.total_tCO2e;
    const prePct = (dppData.carbonFootprint.breakdown.precursorsEmissions / tCO2e) * 100 || 0;
    const s1Pct = (dppData.carbonFootprint.breakdown.directEmissionsScope1 / tCO2e) * 100 || 0;
    const s2Pct = (dppData.carbonFootprint.breakdown.indirectEmissionsScope2 / tCO2e) * 100 || 0;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background-color: #0f172a;
      color: #f8fafc;
      padding: 40px;
      margin: 0;
    }
    .header {
      border-bottom: 2px solid #334155;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      color: #f8fafc;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 24px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .card h2 {
      font-size: 14px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 0;
      border-bottom: 1px solid #334155;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .kv-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 14px;
    }
    .kv-key { color: #cbd5e1; line-height: 1.4; flex-shrink: 0; }
    .kv-val { color: #f8fafc; font-weight: 600; text-align: right; margin-left: 15px; word-break: break-word; }
    
    /* Circularity Chart Simulation */
    .recycled-bar {
      height: 12px;
      border-radius: 6px;
      background: #334155;
      margin-top: 8px;
      display: flex;
      overflow: hidden;
    }
    .recycled-bar .pre { background: #3b82f6; }
    .recycled-bar .post { background: #10b981; }
    .recycled-bar .primary { background: #64748b; }
    
    .status-badge {
      background: #064e3b;
      color: #34d399;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: bold;
    }
    
    /* SVG Pie Chart Container */
    .pie-chart {
      width: 140px;
      height: 140px;
      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
    }
    .legend {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 12px;
      color: #94a3b8;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Digital Product Passport <span class="status-badge">✔ VERIFIED BY TÜV Rheinland</span></h1>
    <div style="color: #94a3b8; margin-top: 10px; font-family: monospace;">Passport ID: ${dppData.general.passportId}</div>
  </div>
  <div class="grid">
    <div class="card">
      <h2>General Information</h2>
      ${blueprintBase64 ? `<div style="text-align: center; margin-bottom: 15px;"><img src="data:image/png;base64,${blueprintBase64}" style="max-width: 100%; max-height: 200px; border-radius: 8px; border: 1px solid #334155;"></div>` : ""}
      <div class="kv-row"><span class="kv-key">Product Name</span><span class="kv-val">${dppData.general.name}</span></div>
      <div class="kv-row"><span class="kv-key">Model Number</span><span class="kv-val">${dppData.general.modelNumber}</span></div>
      <div class="kv-row"><span class="kv-key">CN Code</span><span class="kv-val">${dppData.general.cnCode || "7318.15"}</span></div>
      <div class="kv-row"><span class="kv-key">Category</span><span class="kv-val">${dppData.general.category}</span></div>
      <div class="kv-row"><span class="kv-key">Weight</span><span class="kv-val">${dppData.general.weightKg} kg</span></div>
      <div class="kv-row"><span class="kv-key">Facility</span><span class="kv-val">${dppData.general.facility} (UNLOCODE: ${dppData.general.facilityUNLOCODE || "N/A"})</span></div>
      <div class="kv-row"><span class="kv-key">Manufactured Date</span><span class="kv-val">${dppData.general.manufacturedDate}</span></div>
    </div>
    <div class="card">
      <h2>Carbon Footprint Summary</h2>
      <div style="font-size: 42px; font-weight: bold; color: #10b981; text-align: center; margin-top: 10px;">
        ${dppData.carbonFootprint.total_tCO2e} <span style="font-size: 16px; color: #94a3b8;">tonnes CO₂e</span>
      </div>
      
      <div style="display: flex; align-items: center; justify-content: center; gap: 30px; margin: 25px 0;">
        <div class="pie-chart">
          <svg viewBox="0 0 32 32" style="width: 100%; height: 100%; border-radius: 50%; transform: rotate(-90deg);">
            <!-- Scope 2 (Green) -->
            <circle r="15.9155" cx="16" cy="16" fill="transparent" stroke="#10b981" stroke-width="32" />
            <!-- Scope 1 (Orange) -->
            <circle r="15.9155" cx="16" cy="16" fill="transparent" stroke="#f59e0b" stroke-width="32" stroke-dasharray="${prePct + s1Pct} 100" />
            <!-- Precursors (Blue) -->
            <circle r="15.9155" cx="16" cy="16" fill="transparent" stroke="#3b82f6" stroke-width="32" stroke-dasharray="${prePct} 100" />
          </svg>
        </div>
        <div class="legend">
          <div class="legend-item"><div class="legend-color" style="background: #3b82f6;"></div><span>Precursors: ${prePct.toFixed(1)}%</span></div>
          <div class="legend-item"><div class="legend-color" style="background: #f59e0b;"></div><span>Scope 1: ${s1Pct.toFixed(1)}%</span></div>
          <div class="legend-item"><div class="legend-color" style="background: #10b981;"></div><span>Scope 2: ${s2Pct.toFixed(1)}%</span></div>
        </div>
      </div>

      <div class="kv-row"><span class="kv-key">Precursors Emissions</span><span class="kv-val">${dppData.carbonFootprint.breakdown.precursorsEmissions} tCO₂e</span></div>
      <div class="kv-row"><span class="kv-key">Direct Emissions (Scope 1)</span><span class="kv-val">${dppData.carbonFootprint.breakdown.directEmissionsScope1} tCO₂e</span></div>
      <div class="kv-row"><span class="kv-key">Indirect Emissions (Scope 2)</span><span class="kv-val">${dppData.carbonFootprint.breakdown.indirectEmissionsScope2} tCO₂e</span></div>
    </div>
  </div>
  <div style="page-break-before: always; height: 40px;"></div>
  <div class="card" style="margin-bottom: 30px;">
    <h2>Circularity & Material Composition</h2>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
      ${dppData.circularity.recycledContentShare
        .map(
          (m: IRecycledMaterial) => `
        <div>
          <div class="kv-row" style="margin-bottom: 4px;">
            <span class="kv-key" style="font-weight: bold; color: #f8fafc;">${m.material}</span>
            <span class="kv-val" style="color: #34d399;">Recycled Share: ${m.preConsumerShare + m.postConsumerShare}%</span>
          </div>
          ${
            dppData.materialComposition &&
            dppData.materialComposition.find(
              (c: IMaterialComposition) =>
                c.materialName.includes(m.material) ||
                m.material.includes(c.materialName),
            )
              ? `
            <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">
              Elements: ${dppData.materialComposition
                .find(
                  (c: IMaterialComposition) =>
                    c.materialName.includes(m.material) ||
                    m.material.includes(c.materialName),
                )
                .elements.map(
                  (e: IChemicalElement) => `${e.element} ${String(e.percentage).replace(/,/g, '.')}%`,
                )
                .join(", ")}
            </div>
          `
              : ""
          }
          <div class="recycled-bar">
            <div class="pre" style="width: ${m.preConsumerShare}%"></div>
            <div class="post" style="width: ${m.postConsumerShare}%"></div>
            <div class="primary" style="width: ${m.primaryMaterial}%"></div>
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 8px; display: flex; flex-direction: column; gap: 4px;">
            <span><span style="color: #3b82f6">■</span> Pre-consumer (${m.preConsumerShare}%)</span>
            <span><span style="color: #10b981">■</span> Post-consumer (${m.postConsumerShare}%)</span>
            <span><span style="color: #64748b">■</span> Primary (${m.primaryMaterial}%)</span>
          </div>
        </div>
      `,
        )
        .join("")}
    </div>
  </div>
  <div style="display: flex; flex-direction: column; gap: 30px;">
    <div class="card">
      <h2>Durability & Repair Guidelines</h2>
      <div class="kv-row"><span class="kv-key">Physical Lifespan</span><span class="kv-val">${dppData.durabilityAndRepair.physicalLifespanYears} Years</span></div>
      <div class="kv-row" style="flex-direction: column; gap: 8px; margin-top: 15px;">
        <span class="kv-key">Repairability Notes</span>
        <span class="kv-val" style="color: #cbd5e1; font-weight: normal; line-height: 1.5; white-space: normal; text-align: left; margin-left: 0;">${dppData.durabilityAndRepair.repairability}</span>
      </div>
      <div class="kv-row" style="flex-direction: column; gap: 8px; margin-top: 15px;">
        <span class="kv-key">Disposal Instructions</span>
        <span class="kv-val" style="color: #cbd5e1; font-weight: normal; line-height: 1.5; white-space: normal; text-align: left; margin-left: 0;">${dppData.durabilityAndRepair.disposal}</span>
      </div>
    </div>
    <div class="card">
      <h2>Compliance & Certifications</h2>
      <div class="kv-row"><span class="kv-key">RoHS Compliant</span><span class="kv-val">${dppData.compliance.rohsCompliant ? "✅ YES" : "❌ NO"}</span></div>
      <div class="kv-row"><span class="kv-key">PFAS Free</span><span class="kv-val">${dppData.compliance.pfasFree ? "✅ YES" : "❌ NO"}</span></div>
      <div style="margin-top: 30px; padding: 15px; background: #0f172a; border-radius: 8px; border: 1px solid #334155;">
        <div style="color: #94a3b8; font-size: 12px; margin-bottom: 8px;">Attached Declaration Document</div>
        <div style="color: #3b82f6; font-weight: 500; word-break: break-all;">📄 ${dppData.compliance.declarationDocument}</div>
      </div>
    </div>
  </div>
  <div style="text-align: center; margin-top: 20px; padding: 15px; border-top: 1px dashed #334155; color: #94a3b8; font-size: 12px; line-height: 1.6;">
    * Carbon footprint evaluated according to ISO 14067 / CBAM Implementing Regulation (EU) 2023/1773. System boundary: Cradle-to-Gate.<br>
    * Subject to Customs Nomenclature (CN) Code: <b>${dppData.general.cnCode || "7318.15"}</b>.
  </div>
  <div style="text-align: center; margin-top: 20px; color: #64748b; font-size: 12px;">
    <i>Generated by iSunFA E2E Auditor AI Core - Ground Truth Simulator</i><br>
    Disclaimer: Values shown are for demonstration purposes only.
  </div>
</body>
</html>
    `;

    // 完全移除換行字元，防止 marked.js 把任何區塊解析成 Markdown paragraph (<p>) 導致 CSS 破版
    const safeHtmlContent = htmlContent.replace(/\n/g, " ").replace(/\r/g, "");

    console.log(`⏳ [${productId}] Rendering DPP Dashboard PDF...`);
    const { mdToPdf } = await import("md-to-pdf");
    
    await mdToPdf(
      { content: safeHtmlContent },
      {
        dest: outFile,
        pdf_options: {
          format: "A4",
          margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
          printBackground: true,
        },
      },
    );

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
