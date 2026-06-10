import * as fs from "fs";
import * as path from "path";

export async function renderDppHtml(stockId: string, year: string = "2024") {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/${year}`);
  const baseDir = path.join(dataDir, "outputs");
  const mockSourcesDir = path.join(baseDir, "mock_sources");
  const bomPath = path.join(mockSourcesDir, "boms_and_precursors.json");

  if (!fs.existsSync(bomPath)) {
    console.error(`❌ Missing BOM file: ${bomPath}`);
    process.exit(1);
  }

  const bomRaw = JSON.parse(fs.readFileSync(bomPath, "utf-8"));

  console.log(
    `🚀 [DPP PDF Renderer] 開始為 ${bomRaw.products.length} 項產品生成 Battery Pass 風格 HTML...`,
  );

  for (const product of bomRaw.products) {
    const productId = product.productId;
    const productMockDir = path.join(baseDir, productId, "mock_sources");
    const productIngestionDir = path.join(
      baseDir,
      productId,
      "system_ingestion",
    );
    if (!fs.existsSync(productIngestionDir))
      fs.mkdirSync(productIngestionDir, { recursive: true });

    const groundTruthPath = path.join(
      productMockDir,
      `${productId}_dpp_ground_truth.json`,
    );
    const outFile = path.join(
      productIngestionDir,
      `${productId}_dpp_ground_truth_dashboard.html`,
    );

    if (!fs.existsSync(groundTruthPath)) {
      console.warn(
        `⚠️ [${productId}] 找不到對應的 Ground Truth JSON，跳過 HTML 產出。`,
      );
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

    const logoPath = path.resolve(process.cwd(), "public/isunfa_logo.svg");
    let logoBase64 = "";
    if (fs.existsSync(logoPath)) {
      logoBase64 = fs.readFileSync(logoPath).toString("base64");
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
    const prePct =
      (dppData.carbonFootprint.breakdown.precursorsEmissions / tCO2e) * 100 ||
      0;
    const s1Pct =
      (dppData.carbonFootprint.breakdown.directEmissionsScope1 / tCO2e) * 100 ||
      0;
    const s2Pct =
      (dppData.carbonFootprint.breakdown.indirectEmissionsScope2 / tCO2e) *
        100 || 0;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background-color: #ffffff;
      color: #1e293b;
      margin: 0;
      padding: 0;
      font-size: 13px;
    }
    .header {
      background-color: #0f172a;
      color: #f8fafc;
      padding: 16px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      /* edge to edge */
      margin: 0;
    }
    .header-left {
      display: flex;
      align-items: center;
      font-size: 18px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .header-separator {
      margin: 0 12px;
      color: #334155;
    }
    .header-badge {
      border: 1px solid #1e293b;
      background-color: #0f172a;
      color: #3b82f6;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 500;
    }
    .content-wrapper {
      padding: 30px 40px;
    }
    .doc-meta {
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .doc-tag {
      background-color: #ffedd5;
      color: #c2410c;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .doc-info {
      color: #64748b;
      font-size: 13px;
    }
    .doc-title {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 6px 0;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .card h2 {
      font-size: 13px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 0;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    .kv-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 13px;
    }
    .kv-key { color: #475569; line-height: 1.4; flex-shrink: 0; }
    .kv-val { color: #0f172a; font-weight: 600; text-align: right; margin-left: 15px; word-break: break-word; }
    
    .recycled-bar {
      height: 10px;
      border-radius: 5px;
      background: #f1f5f9;
      margin-top: 6px;
      display: flex;
      overflow: hidden;
    }
    .recycled-bar .pre { background: #f97316; }
    .recycled-bar .post { background: #10b981; }
    .recycled-bar .primary { background: #94a3b8; }
    
    .status-badge {
      background: #dcfce7;
      color: #166534;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: bold;
    }
    
    .pie-chart {
      width: 120px;
      height: 120px;
      border-radius: 50%;
    }
    .legend {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 11px;
      color: #475569;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .legend-color {
      width: 10px;
      height: 10px;
      border-radius: 2px;
    }
    .footer {
      background-color: #fff7ed;
      padding: 20px;
      text-align: center;
      margin-top: 30px;
      border-top: 1px solid #ffedd5;
    }
    .footer-title {
      font-size: 16px;
      font-weight: bold;
      color: #0f172a;
      margin-bottom: 8px;
      letter-spacing: 1px;
    }
    .footer-text {
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      ${logoBase64 ? `<img src="data:image/svg+xml;base64,${logoBase64}" style="height: 24px;">` : `<span>iSunFA</span>`}
      <span class="header-separator">|</span>
      <span>陽光智能碳會計</span>
    </div>
    <div class="header-badge">內部文件</div>
  </div>

  <div class="content-wrapper">
    <div class="doc-meta">
      <div class="doc-tag">系統報告</div>
      <div class="doc-info">iSunFA Enterprise Solutions &nbsp;&bull;&nbsp; ${new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "numeric", day: "numeric" })}</div>
    </div>

    <div class="doc-title">
      Digital Product Passport
      <span class="status-badge">✔ VERIFIED BY TÜV Rheinland</span>
    </div>
    <div style="color: #64748b; margin-bottom: 20px; font-family: monospace; font-size: 12px;">Passport ID: ${dppData.general.passportId}</div>

    <div class="grid">
      <div class="card">
        <h2>General Information</h2>
        ${blueprintBase64 ? `<div style="text-align: center; margin-bottom: 12px;"><img src="data:image/png;base64,${blueprintBase64}" style="max-width: 100%; max-height: 160px; border-radius: 6px; border: 1px solid #e2e8f0;"></div>` : ""}
        <div class="kv-row"><span class="kv-key">Product Name</span><span class="kv-val">${dppData.general.name}</span></div>
        <div class="kv-row"><span class="kv-key">Model Number</span><span class="kv-val">${dppData.general.modelNumber}</span></div>
        <div class="kv-row"><span class="kv-key">GTIN</span><span class="kv-val">${dppData.general.gtin || "N/A"}</span></div>
        <div class="kv-row"><span class="kv-key">Heat Number</span><span class="kv-val">${dppData.general.heatNumber || "N/A"}</span></div>
        <div class="kv-row"><span class="kv-key">Lot Number</span><span class="kv-val">${dppData.general.lotNumber || "N/A"}</span></div>
        <div class="kv-row"><span class="kv-key">CN Code</span><span class="kv-val">${dppData.general.cnCode || "7318.15"}</span></div>
        <div class="kv-row"><span class="kv-key">Category</span><span class="kv-val">${dppData.general.category}</span></div>
        <div class="kv-row"><span class="kv-key">Weight</span><span class="kv-val">${dppData.general.weightKg} kg</span></div>
        <div class="kv-row"><span class="kv-key">Facility</span><span class="kv-val">${dppData.general.facility} (UNLOCODE: ${dppData.general.facilityUNLOCODE || "N/A"})</span></div>
        <div class="kv-row"><span class="kv-key">Manufactured Date</span><span class="kv-val">${dppData.general.manufacturedDate}</span></div>
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e2e8f0;">
          <div style="margin: 0 0 8px 0; font-size: 13px; font-weight: bold; color: #475569;">EU Importer Information</div>
          <div class="kv-row"><span class="kv-key">Company</span><span class="kv-val">${dppData.importer?.companyName || "N/A"}</span></div>
          <div class="kv-row"><span class="kv-key">EORI Number</span><span class="kv-val">${dppData.importer?.eori || "N/A"}</span></div>
        </div>
      </div>
      <div class="card">
        <h2>Carbon Footprint Summary</h2>
        <div style="font-size: 36px; font-weight: bold; color: #10b981; text-align: center; margin-top: 8px;">
          ${dppData.carbonFootprint.total_tCO2e} <span style="font-size: 14px; color: #64748b;">tonnes CO₂e</span>
        </div>
        
        <div style="display: flex; align-items: center; justify-content: center; gap: 24px; margin: 20px 0;">
          <div class="pie-chart" style="background: conic-gradient(#f97316 0% ${prePct.toFixed(2)}%, #3b82f6 ${prePct.toFixed(2)}% ${(prePct + s1Pct).toFixed(2)}%, #10b981 ${(prePct + s1Pct).toFixed(2)}% 100%);">
          </div>
          <div class="legend">
            <div class="legend-item"><div class="legend-color" style="background: #f97316;"></div><span>Precursors: ${prePct.toFixed(1)}%</span></div>
            <div class="legend-item"><div class="legend-color" style="background: #3b82f6;"></div><span>Scope 1: ${s1Pct.toFixed(1)}%</span></div>
            <div class="legend-item"><div class="legend-color" style="background: #10b981;"></div><span>Scope 2: ${s2Pct.toFixed(1)}%</span></div>
          </div>
        </div>

        <div class="kv-row"><span class="kv-key">Precursors Emissions</span><span class="kv-val">${dppData.carbonFootprint.breakdown.precursorsEmissions} tCO₂e</span></div>
        <div class="kv-row"><span class="kv-key">Direct Emissions (Scope 1)</span><span class="kv-val">${dppData.carbonFootprint.breakdown.directEmissionsScope1} tCO₂e</span></div>
        <div class="kv-row"><span class="kv-key">Indirect Emissions (Scope 2)</span><span class="kv-val">${dppData.carbonFootprint.breakdown.indirectEmissionsScope2} tCO₂e</span></div>
      </div>
    </div>
    
    <div style="page-break-before: always;"></div>
    
    <div class="card" style="margin-bottom: 24px; margin-top: 10px;">
      <h2>Circularity & Material Composition</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        ${dppData.circularity.recycledContentShare
          .map(
            (m: IRecycledMaterial) => `
          <div>
            <div class="kv-row" style="margin-bottom: 4px;">
              <span class="kv-key" style="font-weight: bold; color: #0f172a;">${m.material}</span>
              <span class="kv-val" style="color: #16a34a;">Recycled Share: ${m.preConsumerShare + m.postConsumerShare}%</span>
            </div>
            ${
              dppData.materialComposition &&
              dppData.materialComposition.find(
                (c: IMaterialComposition) =>
                  c.materialName.includes(m.material) ||
                  m.material.includes(c.materialName),
              )
                ? `
              <div style="font-size: 10px; color: #64748b; margin-bottom: 6px;">
                Elements: ${dppData.materialComposition
                  .find(
                    (c: IMaterialComposition) =>
                      c.materialName.includes(m.material) ||
                      m.material.includes(c.materialName),
                  )
                  .elements.map(
                    (e: IChemicalElement) =>
                      `${e.element} ${String(e.percentage).replace(/,/g, ".")}%`,
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
            <div style="font-size: 10px; color: #64748b; margin-top: 6px; display: flex; flex-direction: column; gap: 3px;">
              <span><span style="color: #f97316">■</span> Pre-consumer (${m.preConsumerShare}%)</span>
              <span><span style="color: #10b981">■</span> Post-consumer (${m.postConsumerShare}%)</span>
              <span><span style="color: #94a3b8">■</span> Primary (${m.primaryMaterial}%)</span>
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
      <div class="card" style="margin-bottom: 0;">
        <h2>Durability & Technical Specs</h2>
        <div class="kv-row"><span class="kv-key">Surface Treatment</span><span class="kv-val">${dppData.technicalSpecs?.surfaceTreatment || "N/A"}</span></div>
        <div class="kv-row"><span class="kv-key">Salt Spray Test</span><span class="kv-val">${dppData.technicalSpecs?.saltSprayTestHours || "N/A"}</span></div>
        <div class="kv-row"><span class="kv-key">Physical Lifespan</span><span class="kv-val">${dppData.durabilityAndRepair.physicalLifespanYears} Years</span></div>
        <div class="kv-row" style="flex-direction: column; gap: 6px; margin-top: 12px;">
          <span class="kv-key">Repairability Notes</span>
          <span class="kv-val" style="color: #475569; font-weight: normal; line-height: 1.4; white-space: normal; text-align: left; margin-left: 0;">${dppData.durabilityAndRepair.repairability}</span>
        </div>
        <div class="kv-row" style="flex-direction: column; gap: 6px; margin-top: 12px;">
          <span class="kv-key">Disposal Instructions</span>
          <span class="kv-val" style="color: #475569; font-weight: normal; line-height: 1.4; white-space: normal; text-align: left; margin-left: 0;">${dppData.durabilityAndRepair.disposal}</span>
        </div>
      </div>
      <div class="card" style="margin-bottom: 0;">
        <h2>Compliance & Certifications</h2>
        <div class="kv-row"><span class="kv-key">IATF 16949</span><span class="kv-val">${dppData.compliance.iatf16949Compliant ? "✅ YES (" + dppData.compliance.iatfCertificateId + ")" : "❌ NO"}</span></div>
        <div class="kv-row"><span class="kv-key">RoHS Compliant</span><span class="kv-val">${dppData.compliance.rohsCompliant ? "✅ YES" : "❌ NO"}</span></div>
        <div class="kv-row"><span class="kv-key">PFAS Free</span><span class="kv-val">${dppData.compliance.pfasFree ? "✅ YES" : "❌ NO"}</span></div>
        <div style="margin-top: 24px; padding: 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
          <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">Attached Declaration Document</div>
          <div style="color: #3b82f6; font-weight: 500; word-break: break-all; font-size: 12px;">📄 ${dppData.compliance.declarationDocument}</div>
        </div>
      </div>
    </div>
    
    <div style="text-align: center; margin-top: 30px; padding: 15px 15px; border-top: 1px dashed #e2e8f0; color: #64748b; font-size: 11px; line-height: 1.5;">
      * Carbon footprint evaluated according to ISO 14067 / CBAM Implementing Regulation (EU) 2023/1773. System boundary: Cradle-to-Gate.<br>
      * Subject to Customs Nomenclature (CN) Code: <b>${dppData.general.cnCode || "7318.15"}</b>.
      <br><br>
      <i>Generated by iSunFA E2E Auditor AI Core - Ground Truth Simulator</i><br>
      Disclaimer: Values shown are for demonstration purposes only.
    </div>
  </div>

  <div class="footer">
    <div class="footer-title">用人工智能重塑碳會計</div>
    <div class="footer-text">© ${new Date().getFullYear()} iSunFA. All rights reserved. Generated securely via iSunFA Admin Portal.</div>
  </div>
</body>
</html>
    `;

    console.log(`⏳ [${productId}] Rendering DPP Dashboard HTML...`);
    fs.writeFileSync(outFile, htmlContent);
    console.log(
      `🎉 [SUCCESS] [${productId}] 數位產品護照 HTML 已成功產出：${outFile}`,
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const stockId = process.argv[2];
  const year = process.argv[3] || "2024";
  if (!stockId) {
    console.error("Usage: npx tsx render_dpp_html.ts <stockId>");
    process.exit(1);
  }
  renderDppHtml(stockId, year).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
