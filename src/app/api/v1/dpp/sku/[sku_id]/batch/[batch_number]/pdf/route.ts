/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { DppService } from "@/services/dpp.service";
import fs from "fs";
import path from "path";
import { mdToPdf } from "md-to-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sku_id: string; batch_number: string }> },
) {
  try {
    const { sku_id: skuId, batch_number: batchNumber } = await params;

    if (!skuId || !batchNumber) {
      return new Response("Missing sku_id or batch_number", { status: 400 });
    }

    const dppService = new DppService();
    const passport = await dppService.getPublicBatchPassport(
      skuId,
      batchNumber,
    );

    if (!passport || !passport.sku) {
      return new Response("Passport not found", { status: 404 });
    }

    const { sku, batch } = passport;
    const modules = (sku.modulesData || {}) as Record<string, any>;

    const productInfo = (modules["1_product_info"]?.data || {}) as any;
    const envImpact = (modules["2_environmental_impact"]?.data || {}) as any;
    const carbonBreakdown = envImpact.breakdown || {};
    const circularity = (modules["3_circularity"]?.data || {}) as any;
    const recycledContentShare = circularity.recycledContentShare || [];
    const compliance = (modules["4_compliance"]?.data || {}) as any;
    const socialImpact = (modules["5_social_impact"]?.data || {}) as any;
    const repairability = (modules["6_repairability"]?.data || {}) as any;
    const logistics = (modules["7_logistics"]?.data || {}) as any;
    const rawMaterials = (modules["8_critical_raw_materials"]?.data ||
      {}) as any;
    const criticalRawMaterials = rawMaterials.criticalRawMaterials || [];
    const compositionData = (modules["9_material_composition"]?.data ||
      {}) as any;
    const materialComposition = compositionData.materialComposition || [];

    const totalCO2e = Number(envImpact.total_tCO2e || 0);
    const precursors = Number(carbonBreakdown.precursorsEmissions || 0);
    const scope1 = Number(carbonBreakdown.directEmissionsScope1 || 0);
    const scope2 = Number(carbonBreakdown.indirectEmissionsScope2 || 0);

    const totalBreakdown = precursors + scope1 + scope2;
    const prePct = totalBreakdown > 0 ? (precursors / totalBreakdown) * 100 : 0;
    const s1Pct = totalBreakdown > 0 ? (scope1 / totalBreakdown) * 100 : 0;
    const s2Pct = totalBreakdown > 0 ? (scope2 / totalBreakdown) * 100 : 0;

    const displayTCO2e =
      totalCO2e === 0
        ? "0.0000"
        : totalCO2e < 0.0001
          ? totalCO2e.toExponential(2)
          : totalCO2e.toFixed(4);
    const displayPre =
      precursors === 0
        ? "0.0000"
        : precursors < 0.0001
          ? precursors.toExponential(2)
          : precursors.toFixed(4);
    const displayS1 =
      scope1 === 0
        ? "0.0000"
        : scope1 < 0.0001
          ? scope1.toExponential(2)
          : scope1.toFixed(4);
    const displayS2 =
      scope2 === 0
        ? "0.0000"
        : scope2 < 0.0001
          ? scope2.toExponential(2)
          : scope2.toFixed(4);

    const stockId = sku.accountBookName || sku.accountBookId;
    const year = new Date(batch.manufactureDate).getFullYear().toString();
    const modelNumber = productInfo.modelNumber || productInfo.productId;

    let blueprintBase64 = "";
    if (stockId && year && modelNumber) {
      let blueprintPath = path.resolve(
        process.cwd(),
        "data",
        stockId,
        year,
        "outputs",
        modelNumber,
        "mock_sources",
        "fastener_blueprint.png",
      );
      if (!fs.existsSync(blueprintPath)) {
        blueprintPath = path.resolve(
          process.cwd(),
          "data",
          stockId,
          "2024",
          "outputs",
          modelNumber,
          "mock_sources",
          "fastener_blueprint.png",
        );
      }
      if (fs.existsSync(blueprintPath)) {
        blueprintBase64 = fs.readFileSync(blueprintPath).toString("base64");
      }
    }

    const logoPath = path.resolve(process.cwd(), "public/isunfa_logo.svg");
    let logoBase64 = "";
    if (fs.existsSync(logoPath)) {
      logoBase64 = fs.readFileSync(logoPath).toString("base64");
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, sans-serif; background-color: #ffffff; color: #1e293b; margin: 0; padding: 0; font-size: 13px; }
    .header { background-color: #0f172a; color: #f8fafc; padding: 16px 40px; display: flex; justify-content: space-between; align-items: center; margin: 0; }
    .header-left { display: flex; align-items: center; font-size: 18px; font-weight: 600; letter-spacing: 0.5px; }
    .header-separator { margin: 0 12px; color: #334155; }
    .header-badge { border: 1px solid #1e293b; background-color: #0f172a; color: #3b82f6; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 500; }
    .content-wrapper { padding: 20px 40px; }
    .doc-meta { margin-bottom: 12px; display: flex; align-items: center; gap: 12px; }
    .doc-tag { background-color: #ffedd5; color: #c2410c; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .doc-info { color: #64748b; font-size: 13px; }
    .doc-title { font-size: 24px; font-weight: 700; margin: 0 0 6px 0; color: #0f172a; display: flex; align-items: center; gap: 12px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; page-break-inside: avoid; break-inside: avoid; }
    .card h2 { font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 16px; }
    .kv-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
    .kv-key { color: #64748b; line-height: 1.4; flex-shrink: 0; }
    .kv-val { color: #0f172a; font-weight: 600; text-align: right; margin-left: 15px; word-break: break-word; }
    .recycled-bar { height: 10px; border-radius: 5px; background: #f1f5f9; margin-top: 6px; display: flex; overflow: hidden; }
    .recycled-bar .pre { background: #f97316; }
    .recycled-bar .post { background: #10b981; }
    .recycled-bar .primary { background: #94a3b8; }
    .status-badge { background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; }
    .pie-chart { width: 120px; height: 120px; }
    .legend { display: flex; flex-direction: column; gap: 6px; font-size: 11px; color: #475569; }
    .legend-item { display: flex; align-items: center; gap: 6px; }
    .legend-color { width: 10px; height: 10px; border-radius: 2px; }
    .footer { background-color: #fff7ed; padding: 20px; text-align: center; margin-top: 30px; border-top: 1px solid #ffedd5; }
    .footer-title { font-size: 16px; font-weight: bold; color: #0f172a; margin-bottom: 8px; letter-spacing: 1px; }
    .footer-text { font-size: 12px; color: #64748b; }
    .tag { display: inline-flex; align-items: center; border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 600; }
    .tag-blue { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .tag-red { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      ${logoBase64 ? '<img src="data:image/svg+xml;base64,' + logoBase64 + '" style="height: 24px;">' : "<span>iSunFA</span>"}
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
    <div style="color: #64748b; margin-bottom: 20px; font-family: monospace; font-size: 12px;">Passport ID: ${skuId}-${batchNumber}</div>

    <div class="grid">
      <div class="card">
        <h2>General Information</h2>
        ${blueprintBase64 ? '<div style="text-align: center; margin-bottom: 12px;"><img src="data:image/png;base64,' + blueprintBase64 + '" style="max-width: 100%; max-height: 160px; border-radius: 6px; border: 1px solid #e2e8f0;"></div>' : ""}
        <div class="kv-row"><span class="kv-key">Product Name</span><span class="kv-val">${sku.name}</span></div>
        <div class="kv-row"><span class="kv-key">Model Number</span><span class="kv-val">${productInfo.modelNumber || "N/A"}</span></div>
        <div class="kv-row"><span class="kv-key">GTIN</span><span class="kv-val">${sku.gtin || "N/A"}</span></div>
        <div class="kv-row"><span class="kv-key">CN Code</span><span class="kv-val">${productInfo.cnCode || "7318.15"}</span></div>
        <div class="kv-row"><span class="kv-key">Category</span><span class="kv-val">${productInfo.category || "N/A"}</span></div>
        <div class="kv-row"><span class="kv-key">Weight</span><span class="kv-val">${productInfo.weightKg || "N/A"} kg</span></div>
        <div class="kv-row"><span class="kv-key">Facility</span><span class="kv-val">${productInfo.facility || batch.facilitySite} (UNLOCODE: ${productInfo.facilityUNLOCODE || "N/A"})</span></div>
        <div class="kv-row"><span class="kv-key">Manufactured Date</span><span class="kv-val">${productInfo.manufacturedDate || new Date(batch.manufactureDate).toISOString().split("T")[0]}</span></div>
        
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e2e8f0;">
          <div style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #475569;">Batch details</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 12px; border-radius: 6px;">
            <div><div style="font-size: 10px; color: #94a3b8; font-weight: bold;">BATCH NUMBER</div><div style="font-size: 12px; font-weight: bold; color: #1e293b; font-family: monospace;">${batch.batchNumber}</div></div>
            <div><div style="font-size: 10px; color: #94a3b8; font-weight: bold;">SERIAL RANGE</div><div style="font-size: 12px; font-weight: bold; color: #1e293b; font-family: monospace;">${batch.serialRange || "N/A"}</div></div>
          </div>
        </div>

        ${
          logistics.companyName || logistics.eori
            ? `
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e2e8f0;">
          <div style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #475569;">EU Importer Information</div>
          <div class="kv-row"><span class="kv-key">Company</span><span class="kv-val">${logistics.companyName || "N/A"}</span></div>
          <div class="kv-row"><span class="kv-key">EORI Number</span><span class="kv-val">${logistics.eori || "N/A"}</span></div>
        </div>
        `
            : ""
        }
      </div>

      <div class="card">
        <h2>Carbon Footprint Summary</h2>
        <div style="font-size: 36px; font-weight: bold; color: #10b981; text-align: center; margin-top: 8px;">
          ${displayTCO2e} <span style="font-size: 14px; color: #64748b;">tCO₂e</span>
        </div>
        <div style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 4px;">Methodology: ${envImpact.methodology || "ISO 14067 (Cradle-to-Gate)"}</div>
        
        <div style="display: flex; align-items: center; justify-content: center; gap: 24px; margin: 20px 0;">
          <div class="pie-chart" style="border-radius: 50%; background: ${totalBreakdown > 0 ? "conic-gradient(#f97316 0% " + prePct + "%, #3b82f6 " + prePct + "% " + (prePct + s1Pct) + "%, #10b981 " + (prePct + s1Pct) + "% 100%)" : "#10b981"}; display: flex; align-items: center; justify-content: center;">
            <div style="width: 70%; height: 70%; background: #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 10px; color: #64748b; font-weight: 600; line-height: 1.2;">
              CRADLE<br>TO GATE
            </div>
          </div>
          <div class="legend">
            <div class="legend-item"><div class="legend-color" style="background: #f97316;"></div><span>Precursors: ${prePct.toFixed(1)}%</span></div>
            <div class="legend-item"><div class="legend-color" style="background: #3b82f6;"></div><span>Scope 1: ${s1Pct.toFixed(1)}%</span></div>
            <div class="legend-item"><div class="legend-color" style="background: #10b981;"></div><span>Scope 2: ${s2Pct.toFixed(1)}%</span></div>
          </div>
        </div>

        <div style="border-top: 1px solid #f1f5f9; padding-top: 12px;">
          <div class="kv-row"><span class="kv-key">Precursors Emissions</span><span class="kv-val">${displayPre} tCO₂e</span></div>
          <div class="kv-row"><span class="kv-key">Direct Emissions (Scope 1)</span><span class="kv-val">${displayS1} tCO₂e</span></div>
          <div class="kv-row"><span class="kv-key">Indirect Emissions (Scope 2)</span><span class="kv-val">${displayS2} tCO₂e</span></div>
        </div>
      </div>
    </div>
    
    
    <div class="card" style="margin-bottom: 20px; margin-top: 20px;">
      <h2>Circularity & Material Composition</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <!-- Left Column: Recycled Content Share -->
        <div>
          <h3 style="font-size: 12px; color: #334155; margin-top: 0; margin-bottom: 12px;">Recycled Content Share</h3>
          ${recycledContentShare
            .map((m: any) => {
              const preShareRaw = Number(m.preConsumerShare || 0);
              const postShareRaw = Number(m.postConsumerShare || 0);
              const primaryShareRaw = Number(m.primaryMaterial || 0);
              const isFraction =
                preShareRaw + postShareRaw + primaryShareRaw <= 1.01;
              const multiplier = isFraction ? 100 : 1;

              const preShare = preShareRaw * multiplier;
              const postShare = postShareRaw * multiplier;
              const primaryShare = primaryShareRaw * multiplier;
              const totalRecycled = preShare + postShare;

              return (
                '<div style="margin-bottom: 16px; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #f1f5f9;">' +
                '<div class="kv-row" style="margin-bottom: 4px;">' +
                '<span class="kv-key" style="font-weight: bold; color: #0f172a;">' +
                m.material +
                "</span>" +
                '<span class="kv-val" style="color: #10b981;">Recycled: ' +
                totalRecycled.toFixed(1) +
                "%</span>" +
                "</div>" +
                '<div class="recycled-bar">' +
                '<div class="pre" style="width: ' +
                preShare +
                '%"></div>' +
                '<div class="post" style="width: ' +
                postShare +
                '%"></div>' +
                '<div class="primary" style="width: ' +
                primaryShare +
                '%"></div>' +
                "</div>" +
                '<div style="font-size: 9px; color: #64748b; margin-top: 8px; display: flex; flex-wrap: wrap; gap: 8px; font-weight: bold; text-transform: uppercase;">' +
                '<span style="display: flex; align-items: center; gap: 4px;"><span style="color: #f97316; font-size: 14px;">■</span> PRE-CONSUMER (' +
                preShare.toFixed(1) +
                "%)</span>" +
                '<span style="display: flex; align-items: center; gap: 4px;"><span style="color: #10b981; font-size: 14px;">■</span> POST-CONSUMER (' +
                postShare.toFixed(1) +
                "%)</span>" +
                '<span style="display: flex; align-items: center; gap: 4px;"><span style="color: #94a3b8; font-size: 14px;">■</span> PRIMARY (' +
                primaryShare.toFixed(1) +
                "%)</span>" +
                "</div>" +
                "</div>"
              );
            })
            .join("")}
        </div>

        <!-- Right Column: Chemical Composition & Critical Raw Materials -->
        <div>
          <h3 style="font-size: 12px; color: #334155; margin-top: 0; margin-bottom: 12px;">Chemical Composition</h3>
          <div style="margin-bottom: 16px;">
          ${materialComposition
            .map((comp: any) => {
              return (
                '<div style="margin-bottom: 12px; background: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">' +
                '<div style="font-weight: bold; color: #1e293b; margin-bottom: 8px;">' +
                comp.materialName +
                "</div>" +
                '<div style="display: flex; flex-wrap: wrap; gap: 6px;">' +
                comp.elements
                  .map(
                    (el: any) =>
                      '<span style="background: #f1f5f9; color: #475569; padding: 3px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">' +
                      el.element +
                      ": " +
                      Number(el.percentage).toFixed(3) +
                      "%</span>",
                  )
                  .join("") +
                "</div>" +
                "</div>"
              );
            })
            .join("")}
          </div>

          <h3 style="font-size: 12px; color: #334155; margin-top: 24px; margin-bottom: 12px; text-transform: uppercase;">Critical Raw Materials</h3>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${
              criticalRawMaterials.length > 0
                ? criticalRawMaterials
                    .map(
                      (crm: string) =>
                        '<span class="tag tag-red">⚠️ ' + crm + "</span>",
                    )
                    .join("")
                : '<span style="font-size: 11px; color: #94a3b8; font-style: italic;">None identified.</span>'
            }
          </div>
        </div>
      </div>
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
      <div class="card" style="margin-bottom: 0;">
        <h2>Durability & Repairability</h2>
        <div class="kv-row"><span class="kv-key">Physical Lifespan</span><span class="kv-val">${repairability.physicalLifespanYears ? repairability.physicalLifespanYears + " Years" : "N/A"}</span></div>
        <div class="kv-row" style="flex-direction: column; gap: 6px; margin-top: 12px;">
          <span class="kv-key" style="text-transform: uppercase; font-size: 10px; font-weight: bold;">Repairability Instructions</span>
          <span class="kv-val" style="color: #475569; background: #f8fafc; padding: 12px; border-radius: 6px; font-weight: normal; line-height: 1.4; white-space: normal; text-align: left; margin-left: 0;">${repairability.repairability || "No special repair instructions."}</span>
        </div>
        <div class="kv-row" style="flex-direction: column; gap: 6px; margin-top: 12px;">
          <span class="kv-key" style="text-transform: uppercase; font-size: 10px; font-weight: bold;">End of Life / Disposal</span>
          <span class="kv-val" style="color: #475569; background: #f8fafc; padding: 12px; border-radius: 6px; font-weight: normal; line-height: 1.4; white-space: normal; text-align: left; margin-left: 0;">${repairability.disposal || "Dispose in accordance with local e-waste regulations."}</span>
        </div>
      </div>
      
      <div class="card" style="margin-bottom: 0;">
        <h2>Compliance & Certifications</h2>
        <div class="kv-row"><span class="kv-key">IATF 16949</span><span class="kv-val">${compliance.iatf16949Compliant ? "<span style='color: #10b981;'>✅ Compliant (" + (compliance.iatfCertificateId || "Certified") + ")</span>" : "<span style='color: #94a3b8;'>Not Certified</span>"}</span></div>
        <div class="kv-row"><span class="kv-key">RoHS Compliant</span><span class="kv-val">${compliance.rohsCompliant ? "<span style='color: #10b981;'>✅ Compliant</span>" : "<span style='color: #ef4444;'>❌ Non-compliant</span>"}</span></div>
        <div class="kv-row"><span class="kv-key">PFAS Free</span><span class="kv-val">${compliance.pfasFree ? "<span style='color: #10b981;'>✅ PFAS Free</span>" : "<span style='color: #ef4444;'>❌ Contains PFAS</span>"}</span></div>
        
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9;">
          <h3 style="font-size: 12px; color: #334155; margin-top: 0; margin-bottom: 12px;">Social Responsibility</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #f1f5f9; text-align: center;">
              <div style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">Ethical Sourcing</div>
              <div style="font-size: 12px; font-weight: bold; color: #1e293b;">${socialImpact.ethicalSourcing ? "✅ Verified" : "Not Audited"}</div>
            </div>
            <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #f1f5f9; text-align: center;">
              <div style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">Labor Standards</div>
              <div style="font-size: 12px; font-weight: bold; color: #1e293b;">${socialImpact.laborStandardCompliant ? "✅ Compliant" : "Not Audited"}</div>
            </div>
          </div>
        </div>

        ${
          compliance.declarationDocument
            ? `
        <div style="margin-top: 24px; padding: 12px; background: #eff6ff; border-radius: 6px; border: 1px solid #bfdbfe;">
          <div style="color: #94a3b8; font-size: 10px; margin-bottom: 4px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Attached Declaration Document</div>
          <div style="color: #2563eb; font-weight: bold; word-break: break-all; font-size: 11px; font-family: monospace;">📄 ${compliance.declarationDocument}</div>
        </div>
        `
            : ""
        }
      </div>
    </div>
  </div> <!-- end of content-wrapper -->

  <div style="page-break-inside: avoid; break-inside: avoid;">
    <div style="padding: 0 40px;">
      <div style="text-align: center; margin-top: 10px; padding: 10px 15px; border-top: 1px dashed #e2e8f0; color: #64748b; font-size: 11px; line-height: 1.4;">
        * Carbon footprint evaluated according to ISO 14067 / CBAM Implementing Regulation (EU) 2023/1773. System boundary: Cradle-to-Gate.<br>
        <i style="color: #94a3b8; font-weight: bold;">Powered by iSunFA Enterprise Carbon Accounting System • Verified via Decentralized Trust Engine</i>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const safeHtmlContent = htmlContent.replace(/\n/g, " ").replace(/\r/g, "");

    const pdfBuffer = await mdToPdf(
      { content: safeHtmlContent },
      {
        pdf_options: {
          format: "A4",
          margin: { top: "0mm", right: "0mm", bottom: "16mm", left: "0mm" },
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: "<span></span>",
          footerTemplate: `<div style="width: 100%; text-align: center; font-family: Arial, sans-serif; font-size: 9px; color: #64748b; padding: 10px 0; border-top: 1px solid #e2e8f0; background: #fff7ed !important; -webkit-print-color-adjust: exact;"><div style="font-weight: bold; color: #1e293b; font-size: 10px; margin-bottom: 2px;">用人工智能重塑碳會計</div><div>© ${new Date().getFullYear()} iSunFA. All rights reserved. Generated securely via iSunFA Admin Portal.</div></div>`,
        },
      },
    );

    return new Response(pdfBuffer.content as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="' + sku.name + "_DPP_" + batchNumber + '.pdf"',
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
