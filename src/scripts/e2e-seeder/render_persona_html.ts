import * as fs from "fs";
import * as path from "path";

// Info: (20260608 - Tzuhan) 定義 PersonaData 型別，嚴格遵守免 any 開發規範
interface IManufacturingProcess {
  stepName: string;
  description: string;
  energyIntensity: string;
  lossRate: number;
  processWeight_percent: number;
}

interface ISupplier {
  name: string;
  taxId: string;
  errorRate: number;
}

interface ISupplierCategory {
  category: string;
  suppliers: ISupplier[];
}

interface IRelatedParty {
  name: string;
  relationship: string;
}

interface IBankAccount {
  bankCode: string;
  isForeign: boolean;
}

interface IPersonaData {
  revenueScale: string;
  totalRevenue_NTD: number;
  totalScope2Emissions_tCO2e: number;
  estimatedAnnualVouchers: number;
  industryDynamics: string;
  manufacturingProcess?: IManufacturingProcess[];
  topSuppliers?: ISupplierCategory[];
  voucherCalculationRationale: string;
  relatedParties?: IRelatedParty[];
  commonBankAccounts?: IBankAccount[];
}

export async function renderPersonaHtml(stockId: string, year: string = "2024") {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/${year}`);
  const baseDir = path.join(dataDir, "outputs", "e2e_roadmap-sprint1");
  const personaPath = path.join(baseDir, `${stockId}_company_persona.json`);

  if (!fs.existsSync(personaPath)) {
    console.error(`❌ Missing Persona JSON file: ${personaPath}`);
    process.exit(1);
  }

  const personaData: IPersonaData = JSON.parse(fs.readFileSync(personaPath, "utf-8"));

  console.log(`🚀 [Persona HTML Renderer] 開始為 ${stockId} 生成企業畫像 HTML...`);

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
    .content-wrapper { padding: 30px 40px; }
    .doc-meta { margin-bottom: 12px; display: flex; align-items: center; gap: 12px; }
    .doc-tag { background-color: #ffedd5; color: #c2410c; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .doc-info { color: #64748b; font-size: 13px; }
    .doc-title { font-size: 24px; font-weight: 700; margin: 0 0 6px 0; color: #0f172a; display: flex; align-items: center; gap: 12px; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; break-inside: avoid; }
    .card h2 { font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 16px; }
    .kv-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
    .kv-key { color: #475569; font-weight: 500; }
    .kv-val { color: #0f172a; font-weight: 600; text-align: right; max-width: 60%; word-break: break-word; }
    .text-block { font-size: 13px; color: #334155; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
    th { text-align: left; background-color: #f8fafc; padding: 8px; border-bottom: 2px solid #e2e8f0; color: #475569; }
    td { padding: 8px; border-bottom: 1px solid #e2e8f0; color: #334155; }
    .footer { background-color: #f8fafc; padding: 20px; text-align: center; margin-top: 30px; border-top: 1px solid #e2e8f0; }
    .footer-title { font-size: 14px; font-weight: bold; color: #0f172a; margin-bottom: 8px; letter-spacing: 1px; }
    .footer-text { font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      ${logoBase64 ? `<img src="data:image/svg+xml;base64,${logoBase64}" style="height: 24px;">` : `<span>iSunFA</span>`}
      <span class="header-separator">|</span>
      <span>陽光智能企業建檔系統</span>
    </div>
    <div class="header-badge">機密文件</div>
  </div>

  <div class="content-wrapper">
    <div class="doc-meta">
      <div class="doc-tag">企業基本畫像 (Persona)</div>
      <div class="doc-info">iSunFA Enterprise Solutions &nbsp;&bull;&nbsp; Year ${year}</div>
    </div>
    <div class="doc-title">Enterprise Profile: ${stockId}</div>
    <div style="color: #64748b; margin-bottom: 20px; font-family: monospace; font-size: 12px;">Generated for E2E Mock Data Seeding</div>

    <div class="card">
      <h2>Macro & Operations Overview</h2>
      <div class="kv-row"><span class="kv-key">Revenue Scale</span><span class="kv-val">${personaData.revenueScale}</span></div>
      <div class="kv-row"><span class="kv-key">Total Revenue (NTD)</span><span class="kv-val">${(personaData.totalRevenue_NTD || 0).toLocaleString()}</span></div>
      <div class="kv-row"><span class="kv-key">Total Scope 2 Emissions</span><span class="kv-val">${(personaData.totalScope2Emissions_tCO2e || 0).toLocaleString()} tCO₂e</span></div>
      <div class="kv-row"><span class="kv-key">Est. Annual Vouchers</span><span class="kv-val">${(personaData.estimatedAnnualVouchers || 0).toLocaleString()}</span></div>
      
      <h3 style="font-size: 12px; color: #475569; margin-top: 20px;">Industry Dynamics</h3>
      <div class="text-block">${personaData.industryDynamics}</div>
    </div>

    <div class="card">
      <h2>Manufacturing Process</h2>
      <table>
        <thead>
          <tr>
            <th>Step</th>
            <th>Description</th>
            <th>Energy</th>
            <th>Loss Rate</th>
            <th>Emission Weight</th>
          </tr>
        </thead>
        <tbody>
          ${(personaData.manufacturingProcess || []).map((p) => `
            <tr>
              <td style="font-weight: 600;">${p.stepName}</td>
              <td style="max-width: 200px;">${p.description}</td>
              <td>${p.energyIntensity}</td>
              <td>${(p.lossRate * 100).toFixed(1)}%</td>
              <td>${p.processWeight_percent}%</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>

    <div style="page-break-before: always;"></div>

    <div class="card">
      <h2>Top Suppliers</h2>
      ${(personaData.topSuppliers || []).map((cat) => `
        <h3 style="font-size: 12px; color: #475569; margin-top: 10px;">Category: ${cat.category}</h3>
        <table>
          <thead>
            <tr>
              <th>Supplier Name</th>
              <th>Tax ID</th>
              <th>Error Rate (Visual)</th>
            </tr>
          </thead>
          <tbody>
            ${(cat.suppliers || []).map((sup) => `
              <tr>
                <td style="font-weight: 600;">${sup.name}</td>
                <td>${sup.taxId}</td>
                <td>${(sup.errorRate * 100).toFixed(1)}%</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `).join("")}
    </div>

    <div class="card">
      <h2>Financial Logistics</h2>
      <h3 style="font-size: 12px; color: #475569;">Voucher Calculation Rationale</h3>
      <div class="text-block" style="margin-bottom: 16px;">${personaData.voucherCalculationRationale}</div>

      <div style="display: flex; gap: 20px;">
        <div style="flex: 1;">
          <h3 style="font-size: 12px; color: #475569;">Related Parties</h3>
          <ul>
            ${(personaData.relatedParties || []).map((rp) => `<li style="font-size: 12px; margin-bottom: 4px;"><b>${rp.name}</b> (${rp.relationship})</li>`).join("")}
          </ul>
        </div>
        <div style="flex: 1;">
          <h3 style="font-size: 12px; color: #475569;">Common Bank Accounts</h3>
          <ul>
            ${(personaData.commonBankAccounts || []).map((ba) => `<li style="font-size: 12px; margin-bottom: 4px;">Bank Code: <b>${ba.bankCode}</b> ${ba.isForeign ? "(Foreign)" : "(Domestic)"}</li>`).join("")}
          </ul>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-title">用人工智能重塑碳會計</div>
    <div class="footer-text">© ${new Date().getFullYear()} iSunFA. Generated automatically from AI Persona Engine.</div>
  </div>
</body>
</html>
  `;

  // Info: (20260608 - Tzuhan) Save as HTML instead of generating PDF
  const outHtmlPath = path.join(baseDir, `${stockId}_company_persona.html`);
  console.log(`⏳ [Persona HTML Renderer] 寫入 HTML 檔案至 ${outHtmlPath}...`);

  fs.writeFileSync(outHtmlPath, htmlContent, "utf-8");

  console.log(`🎉 [SUCCESS] 企業畫像 HTML 已成功產出：${outHtmlPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const stockId = process.argv[2];
  const year = process.argv[3] || "2024";
  if (!stockId) {
    console.error("Usage: npx tsx render_persona_html.ts <stockId> [year]");
    process.exit(1);
  }
  renderPersonaHtml(stockId, year).catch((e) => { console.error(e); process.exit(1); });
}
