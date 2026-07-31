// Info: (20260731 - Tzuhan) 運輸報告的列印用 HTML 產生器(純函數,不碰 IO 也不碰 puppeteer)
// Info: (20260731 - Tzuhan) 這是 buildBatchSummaryCsv 之外、對同一份資料的第二個渲染器:
// Info: (20260731 - Tzuhan) 逐段數值一律取自 buildPlanLegs 的輸出,不在此重新推導,避免 CSV 與 PDF 各說各話。
// Info: (20260731 - Tzuhan) 拆成純函數的理由:PDF 產出需要 Chrome(沙箱與 CI 都沒有),
// Info: (20260731 - Tzuhan) 但版面與數值正確性必須可被單元測試 —— 故把「組 HTML」與「印成 PDF」分開。

import {
  EMISSION_FACTORS,
  EMISSION_FACTOR_SOURCES,
} from "@/constants/logistics";
import {
  LOGISTICS_PDF_FONT_STACK,
  LOGISTICS_PDF_MAP_DATA_URL_PATTERN,
  LOGISTICS_PDF_MAP_MAX_BYTES,
} from "@/constants/logistics_pdf";
/**
 * Info: (20260731 - Tzuhan) 列印用的扁平段落 DTO。刻意不直接吃 `IPlanLeg`:
 * 那個型別內嵌完整的 `ITransportSegment`(含 geometry 與 success),而列印只需要
 * 距離、係數、排放與端點。用 DTO 讓 API 契約最小化 —— 傳不需要的欄位過網路是白花錢,
 * 也讓 validator 能逐欄收斂(見 validators/logistics_report_pdf.ts)。
 * 前端負責 `IPlanLeg` → `IReportLeg` 的一次映射,兩者的逐段推導仍共用 buildPlanLegs。
 */
export interface IReportLeg {
  mode: "LAND" | "SEA" | "AIR";
  fromName: string;
  toName: string;
  fromLat?: number;
  fromLng?: number;
  toLat?: number;
  toLng?: number;
  distanceKm?: number;
  /** Info: (20260731 - Tzuhan) 與 ITransportSegment 一致以字串傳遞:Decimal 的字串形式不可轉 number */
  co2eKg?: string;
  isFallback?: boolean;
}

export interface ILogisticsReportHtmlInput {
  /** Info: (20260731 - Tzuhan) 方案代碼(R01-SEA):與 CSV 的 Code 欄及檔名一致,是三者的交叉索引 */
  planCode: string;
  routeLabel: string;
  planLabel: string;
  originLabel: string;
  destLabel: string;
  /** Info: (20260731 - Tzuhan) 實際計算用重量(kg),字串以避免浮點格式化差異 */
  weightKg: string;
  legs: IReportLeg[];
  /** Info: (20260731 - Tzuhan) 方案總排放(kg CO2e);缺值時顯示 N/A,不以 0 充數 */
  planTotalCo2e?: string;
  /** Info: (20260731 - Tzuhan) 地圖影像 data URL(JPEG/PNG);過大或格式不符即略過並揭露 */
  mapImageDataUrl?: string;
  exportId?: string;
  generatedAt: string;
}

const FACTOR_BY_MODE: Record<IReportLeg["mode"], string> = {
  LAND: EMISSION_FACTORS.LAND,
  SEA: EMISSION_FACTORS.SEA,
  AIR: EMISSION_FACTORS.AIR,
};

const FACTOR_SOURCE_BY_MODE: Record<IReportLeg["mode"], string> = {
  LAND: EMISSION_FACTOR_SOURCES.LAND,
  SEA: EMISSION_FACTOR_SOURCES.SEA,
  AIR: EMISSION_FACTOR_SOURCES.AIR,
};

/**
 * Info: (20260731 - Tzuhan) HTML 逸出:這些字串來自使用者輸入的地點名稱與上傳資料,
 * 會被放進交給 Chrome 的 HTML,不逸出即為注入面。
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Info: (20260731 - Tzuhan) 地圖影像裁決:格式不符或超過體積上限一律不嵌入。
 * 回傳 null 時呼叫端會印出「地圖略過」的說明 —— 不靜默少一張圖。
 */
export function resolveMapImage(dataUrl?: string): {
  src: string | null;
  reason?: "invalid_format" | "too_large";
} {
  if (!dataUrl) return { src: null };
  if (!LOGISTICS_PDF_MAP_DATA_URL_PATTERN.test(dataUrl)) {
    return { src: null, reason: "invalid_format" };
  }
  // Info: (20260731 - Tzuhan) base64 每 4 字元代表 3 bytes,以此推算解碼後大小,不需真的解碼
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const approxBytes = Math.floor((base64.length * 3) / 4);
  if (approxBytes > LOGISTICS_PDF_MAP_MAX_BYTES) {
    return { src: null, reason: "too_large" };
  }
  return { src: dataUrl };
}

const formatNumber = (value?: string | number): string => {
  if (value === undefined || value === null || value === "") return "N/A";
  const num = Number(value);
  if (!Number.isFinite(num)) return "N/A";
  return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
};

const coordText = (lat?: number, lng?: number): string =>
  lat === undefined || lng === undefined
    ? ""
    : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

/**
 * Info: (20260731 - Tzuhan) 組出單一方案的 A4 列印 HTML。
 * 版面刻意不照抄螢幕:螢幕版是可捲動的卡片牆,列印版需要固定表頭與分頁友善的表格。
 * 「一份 PDF 一個方案」的既有約定不變(需求二),故此函數一次只處理一個方案。
 */
export function buildLogisticsReportHtml(
  input: ILogisticsReportHtmlInput,
): string {
  const map = resolveMapImage(input.mapImageDataUrl);

  const legRows = input.legs
    .map((leg, index) => {
      const from = escapeHtml(leg.fromName);
      const to = escapeHtml(leg.toName);
      const fromCoord = coordText(leg.fromLat, leg.fromLng);
      const toCoord = coordText(leg.toLat, leg.toLng);
      return `<tr>
  <td class="num">${index + 1}</td>
  <td><span class="mode mode-${leg.mode.toLowerCase()}">${leg.mode}</span></td>
  <td>${from}${fromCoord ? `<span class="coord">${fromCoord}</span>` : ""}</td>
  <td>${to}${toCoord ? `<span class="coord">${toCoord}</span>` : ""}</td>
  <td class="num">${formatNumber(leg.distanceKm)}${leg.isFallback ? '<span class="est">est.</span>' : ""}</td>
  <td class="num">${FACTOR_BY_MODE[leg.mode]}</td>
  <td class="num">${formatNumber(leg.co2eKg)}</td>
</tr>`;
    })
    .join("\n");

  // Info: (20260731 - Tzuhan) 係數來源逐一列出:查核者要能自行以公開係數重算每一格
  const sources = Array.from(
    new Set(input.legs.map((leg) => FACTOR_SOURCE_BY_MODE[leg.mode])),
  )
    .map((source) => escapeHtml(source))
    .join(" · ");

  const mapBlock = map.src
    ? `<img class="map" src="${map.src}" alt="route map" />`
    : `<p class="note">${
        map.reason === "too_large"
          ? "地圖影像超過體積上限,已略過(報告數值不受影響)"
          : map.reason === "invalid_format"
            ? "地圖影像格式不受支援,已略過(報告數值不受影響)"
            : "本報告未附地圖"
      }</p>`;

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(input.planCode)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ${LOGISTICS_PDF_FONT_STACK}; font-size: 10pt; color: #1e293b; }
  h1 { font-size: 15pt; margin: 0 0 2mm; }
  .code { font-family: ui-monospace, Menlo, monospace; font-size: 11pt; font-weight: 700; color: #c2410c; }
  .meta { font-size: 8.5pt; color: #64748b; margin: 0 0 4mm; }
  .grid { display: flex; gap: 6mm; margin-bottom: 4mm; }
  .card { flex: 1; border: 0.3mm solid #e2e8f0; border-radius: 1.5mm; padding: 3mm; }
  .card .label { font-size: 8pt; color: #64748b; }
  .card .value { font-size: 13pt; font-weight: 700; }
  .map { width: 100%; max-height: 70mm; object-fit: cover; border: 0.3mm solid #e2e8f0; border-radius: 1.5mm; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  thead { display: table-header-group; }
  th { text-align: left; background: #f8fafc; border-bottom: 0.4mm solid #cbd5e1; padding: 1.6mm 1.2mm; font-size: 8pt; color: #475569; }
  td { border-bottom: 0.2mm solid #eef2f6; padding: 1.6mm 1.2mm; vertical-align: top; }
  tr { break-inside: avoid; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .coord { display: block; font-size: 7pt; color: #94a3b8; }
  .est { display: inline-block; margin-left: 1mm; font-size: 7pt; color: #b45309; }
  .mode { font-size: 7.5pt; font-weight: 700; padding: 0.4mm 1.2mm; border-radius: 1mm; }
  .mode-land { background: #ecfdf5; color: #047857; }
  .mode-sea { background: #eff6ff; color: #1d4ed8; }
  .mode-air { background: #f5f3ff; color: #6d28d9; }
  .total { margin-top: 3mm; text-align: right; font-size: 11pt; font-weight: 700; }
  .note { font-size: 8pt; color: #64748b; margin: 2mm 0; }
  .formula { margin-top: 4mm; padding-top: 2mm; border-top: 0.2mm solid #e2e8f0; font-size: 7.5pt; color: #64748b; }
</style>
</head>
<body>
  <h1><span class="code">${escapeHtml(input.planCode)}</span> ${escapeHtml(input.planLabel)}</h1>
  <p class="meta">
    ${escapeHtml(input.originLabel)} → ${escapeHtml(input.destLabel)}
    · ${escapeHtml(input.routeLabel)}
    · ${formatNumber(input.weightKg)} kg
    · ${escapeHtml(input.generatedAt)}${input.exportId ? ` · Export ${escapeHtml(input.exportId)}` : ""}
  </p>
  <div class="grid">
    <div class="card">
      <div class="label">方案總排放</div>
      <div class="value">${formatNumber(input.planTotalCo2e)} <span style="font-size:9pt">kg CO2e</span></div>
    </div>
    <div class="card">
      <div class="label">段數</div>
      <div class="value">${input.legs.length}</div>
    </div>
  </div>
  ${mapBlock}
  <table>
    <thead>
      <tr>
        <th>#</th><th>Mode</th><th>From</th><th>To</th>
        <th class="num">Distance (km)</th><th class="num">Factor</th><th class="num">CO2e (kg)</th>
      </tr>
    </thead>
    <tbody>
${legRows}
    </tbody>
  </table>
  <p class="total">Total ${formatNumber(input.planTotalCo2e)} kg CO2e</p>
  <div class="formula">
    Leg CO2e = Distance × (Weight / 1000) × Factor ·
    Factors (kg CO2e/t-km): LAND ${EMISSION_FACTORS.LAND} | SEA ${EMISSION_FACTORS.SEA} | AIR ${EMISSION_FACTORS.AIR} ·
    ${sources} ·
    est. = 直線距離 × 1.2 推估(該段無路網資料)
  </div>
</body>
</html>`;
}
