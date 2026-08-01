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
  buildScaleBar,
  computeRenderedMapSizeMm,
  ScaleBarOmissionEnum,
} from "@/lib/utils/map_scale_bar";
import {
  reconcileLegTotals,
  ReconciliationVerdictEnum,
  REPORT_DISPLAY_DECIMALS,
} from "@/lib/utils/report_disclosure";
import {
  LOGISTICS_PDF_FONT_STACK,
  LOGISTICS_PDF_LEG_MAP_GAP_MM,
  LOGISTICS_PDF_LEG_MAP_MAX_HEIGHT_MM,
  LOGISTICS_PDF_LEG_MAP_RENDER_WIDTH_MM,
  LOGISTICS_PDF_MAP_MAX_HEIGHT_MM,
  LOGISTICS_PDF_MAP_RENDER_WIDTH_MM,
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
  /**
   * Info: (20260731 - Tzuhan) 該段的路徑圖(JPEG data URL)。實測回報:只有一張總圖時,
   * 市區→機場、機場→市區的接駁段完全看不到路徑,報告無法作為那兩段的證據。
   */
  mapImageDataUrl?: string;
  /** Info: (20260731 - Tzuhan) 該段地圖的每像素公尺數,用於決定性地畫出比例尺 */
  metersPerPixel?: number;
  /**
   * Info: (20260801 - Luphia) 截圖畫布的 CSS 尺寸,與 metersPerPixel 成對送出。
   * 少了它就只知道「一像素多少公尺」卻不知道有幾個像素,無從得知這張圖橫跨多遠,
   * 比例尺畫在紙上該多長也就算不出來。
   */
  captureWidthPx?: number;
  captureHeightPx?: number;
  /** Info: (20260801 - Luphia) 該段視野的南北緯度界(Mercator 比例尺護欄用) */
  captureLatSouthDeg?: number;
  captureLatNorthDeg?: number;
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
  /** Info: (20260731 - Tzuhan) 總圖的每像素公尺數(比例尺用) */
  metersPerPixel?: number;
  /** Info: (20260801 - Luphia) 總圖截圖畫布的 CSS 尺寸(比例尺與版面尺寸用) */
  captureWidthPx?: number;
  captureHeightPx?: number;
  /** Info: (20260801 - Luphia) 總圖視野的南北緯度界(Mercator 比例尺護欄用) */
  captureLatSouthDeg?: number;
  captureLatNorthDeg?: number;
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
 * Info: (20260801 - Luphia) 比例尺的文字。附參考緯線時寫成「2000 km @ 32.5°N」——
 * 有了它讀者才知道這條線在圖上哪個高度才準;沒有它,一條隨緯度變化的比例尺
 * 會被當成整張圖通用。均勻時不附,以免暗示比實際更高的精確度。
 */
function formatScaleTick(bar: {
  label: string;
  referenceLatitudeDeg?: number;
}): string {
  if (bar.referenceLatitudeDeg === undefined) return bar.label;
  const lat = bar.referenceLatitudeDeg;
  const hemisphere = lat >= 0 ? "N" : "S";
  return `${bar.label} @ ${Math.abs(lat).toFixed(1)}°${hemisphere}`;
}

interface IMapFigureInput {
  dataUrl?: string;
  metersPerPixel?: number;
  /**
   * Info: (20260801 - Luphia) 截圖當下畫布的 CSS 尺寸。必須與 metersPerPixel 成對使用:
   * 兩者相乘才得到這張圖橫跨的實際距離,而長寬比決定影像在紙面上實際被畫成多大。
   * 缺任一項就無從得知紙上一公釐代表多少公尺,此時不畫比例尺。
   */
  captureWidthPx?: number;
  captureHeightPx?: number;
  /** Info: (20260801 - Luphia) 視野南北緯度界:Mercator 比例隨緯度變化,跨幅過大時不畫比例尺 */
  captureLatSouthDeg?: number;
  captureLatNorthDeg?: number;
  caption: string;
  compact?: boolean;
}

/**
 * Info: (20260731 - Tzuhan) 單張地圖圖框:影像 + 比例尺 + 圖說。
 *
 * 三個立場:
 * 1. 圖不裁切(CSS `object-fit: contain`)—— 被裁掉的往往正是路線端點,那就不成證據了。
 * 2. 有比例尺才畫,沒有就不畫;**絕不畫一條猜出來的比例尺**(錯的比例尺會讓讀者
 *    以為自己驗證過距離,比沒有更糟)。
 * 3. 缺圖時仍輸出圖說與原因,讀者要能分辨「沒有圖」與「沒有這一段」。
 */
export function renderMapFigure(input: IMapFigureInput): string {
  const resolved = resolveMapImage(input.dataUrl);
  const cls = input.compact ? "figure compact" : "figure";
  if (!resolved.src) {
    const reason =
      resolved.reason === "too_large"
        ? "地圖影像超過體積上限,已略過"
        : resolved.reason === "invalid_format"
          ? "地圖影像格式不受支援,已略過"
          : "本段未附路徑圖";
    return `<figure class="${cls}"><p class="note">${reason}(數值不受影響)</p><figcaption>${input.caption}</figcaption></figure>`;
  }

  // Info: (20260731 - Tzuhan) 逐段小圖是兩欄版面,顯示寬度只有一半;用錯基準會讓比例尺長度差一倍
  const containerWidthMm = input.compact
    ? LOGISTICS_PDF_LEG_MAP_RENDER_WIDTH_MM
    : LOGISTICS_PDF_MAP_RENDER_WIDTH_MM;
  const maxHeightMm = input.compact
    ? LOGISTICS_PDF_LEG_MAP_MAX_HEIGHT_MM
    : LOGISTICS_PDF_MAP_MAX_HEIGHT_MM;

  /**
   * Info: (20260801 - Luphia) 先算出影像在紙面上的實際尺寸,再把外框直接設成這個尺寸。
   * 這樣 `object-fit: contain` 就永遠不會留白,影像邊界與外框邊界重合 ——
   * 比例尺是絕對定位在外框內的,外框若比影像大,比例尺就會落在留白區而不是地圖上
   * (實測回報的「位置錯誤」即為此)。
   * 尺寸算不出來(舊版前端未回報截圖尺寸)時退回原本的自適應版面,只是不畫比例尺。
   */
  const renderedSize = computeRenderedMapSizeMm(
    input.captureWidthPx,
    input.captureHeightPx,
    containerWidthMm,
    maxHeightMm,
  );

  const scale = renderedSize
    ? buildScaleBar({
        metersPerPixel: input.metersPerPixel,
        captureWidthPx: input.captureWidthPx,
        renderedWidthMm: renderedSize.widthMm,
        latSouthDeg: input.captureLatSouthDeg,
        latNorthDeg: input.captureLatNorthDeg,
      })
    : ({
        drawn: false,
        reason: ScaleBarOmissionEnum.MISSING_INPUT,
      } as const);

  /**
   * Info: (20260801 - Luphia) 線段長度以 mm 寫死而非百分比。
   * 百分比會對「最近的定位祖先」求值,也就是這個收縮包住文字的標籤盒本身,
   * 而不是地圖 —— 先前線段只剩幾公釐的成因就在這裡。mm 是絕對單位,沒有這個問題。
   *
   * 比例已明顯隨緯度變化時附註參考緯線:讀者必須知道「這條線在哪裡才準」,
   * 否則他會拿它去量圖上任何一段。
   */
  const scaleBlock = scale.drawn
    ? `<div class="scalebar"><span class="bar" style="width:${scale.bar.widthMm}mm"></span><span class="tick">${escapeHtml(formatScaleTick(scale.bar))}</span></div>`
    : "";

  /**
   * Info: (20260801 - Luphia) 跨緯度過大而不畫比例尺時必須說明,不可靜默省略。
   * 讀者要能分辨「這張圖沒有比例尺」是缺件還是刻意的判斷 ——
   * 沒有說明的話,一個正確的決定看起來會像故障。
   * 反過來,若真的畫上去,一條在圖兩端相差逾半的線會讓讀者以為自己驗證過距離。
   */
  const scaleNote =
    !scale.drawn && scale.reason === ScaleBarOmissionEnum.LATITUDE_SPAN_TOO_WIDE
      ? '<p class="note scalenote">本圖跨越緯度過大,Mercator 投影的比例隨緯度變化,單一比例尺不成立故未標示(距離數值不受影響,見上表)</p>'
      : "";

  const boxStyle = renderedSize
    ? ` style="width:${renderedSize.widthMm}mm;height:${renderedSize.heightMm}mm"`
    : "";

  /**
   * Info: (20260801 - Luphia) 說明置於圖說**之後**而非圖與圖說之間。
   * 逐段小圖是兩欄版面,說明有兩行而圖說只有一行 —— 夾在中間會把該欄的圖說往下推,
   * 左右兩欄的圖說於是不對齊(實測 R02-AIR 第 1、2 段相差一行)。
   * 置於圖說之後也更符合閱讀順序:先知道這是哪一段,再讀為什麼沒有比例尺。
   */
  return `<figure class="${cls}"><div class="mapbox"${boxStyle}><img class="map" src="${resolved.src}" alt="${input.caption}" />${scaleBlock}</div><figcaption>${input.caption}</figcaption>${scaleNote}</figure>`;
}

/**
 * Info: (20260801 - Luphia) 加總可驗證性的揭露文字。
 *
 * 三種措辭對應三種事實,不可混用:
 * - 完全相符:仍說明顯示位數,讓查核者知道自己重算時該預期什麼精度
 * - 落在四捨五入內:明確給出差額與來源,查核者不需要自己推敲那 0.01 是哪來的
 * - 超出四捨五入:這不是排版問題而是兩套推導分歧,措辭必須讓人警覺並轉向 CSV 核對
 *
 * 刻意不把總計改成逐列的和 —— 那會讓 PDF 與 CSV、與資料庫出現三套數字,
 * 正是本檔開頭警告的「避免 CSV 與 PDF 各說各話」。揭露而不改數字。
 */
function renderReconciliationNote(reconciliation: {
  verdict: ReconciliationVerdictEnum;
  displayedSum: number;
  displayedTotal: number;
  difference: number;
}): string {
  const { verdict, displayedSum, displayedTotal, difference } = reconciliation;
  if (verdict === ReconciliationVerdictEnum.INDETERMINATE) return "";

  const decimals = `小數 ${REPORT_DISPLAY_DECIMALS} 位`;

  if (verdict === ReconciliationVerdictEnum.EXACT) {
    return `<div class="formula recon">各段數值四捨五入至${decimals}顯示;本表逐列相加與總計一致。完整精度見同批匯出的 summary.csv。</div>`;
  }

  if (verdict === ReconciliationVerdictEnum.WITHIN_ROUNDING) {
    return `<div class="formula recon">各段數值四捨五入至${decimals}顯示,總計以未捨入值計算,故逐列相加(${formatNumber(displayedSum)})與總計(${formatNumber(displayedTotal)})相差 ${formatNumber(Math.abs(difference))} kg —— 此差異來自顯示捨入,非計算差異。完整精度見同批匯出的 summary.csv。</div>`;
  }

  // Info: (20260801 - Luphia) DIVERGENT:差異無法以捨入解釋,必須讓讀者知道這不是排版問題
  return `<div class="formula recon warn">注意:逐列相加(${formatNumber(displayedSum)})與總計(${formatNumber(displayedTotal)})相差 ${formatNumber(Math.abs(difference))} kg,超出四捨五入可解釋的範圍。逐段數值與方案總計由兩套推導產生,此差異需以 summary.csv 核對後判定。</div>`;
}

/**
 * Info: (20260731 - Tzuhan) 組出單一方案的 A4 列印 HTML。
 * 版面刻意不照抄螢幕:螢幕版是可捲動的卡片牆,列印版需要固定表頭與分頁友善的表格。
 * 「一份 PDF 一個方案」的既有約定不變(需求二),故此函數一次只處理一個方案。
 */
export function buildLogisticsReportHtml(
  input: ILogisticsReportHtmlInput,
): string {
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

  /**
   * Info: (20260801 - Luphia) 自我勾稽:逐列相加是否等於總計。
   *
   * 頁尾印出計算公式即是邀請查核者逐列重算,而逐段顯示到小數 2 位、總計取自上游
   * 未捨入的值 —— 兩者本來就可能差幾分錢。實測 R01 差 0.01、R02 恰好對上,
   * 也就是「查核者會不會發現對不上」取決於運氣,而報告完全沒揭露。
   * 「加總對不上」對審計文件是必被提問的一項,故一律揭露。
   */
  const reconciliation = reconcileLegTotals(
    input.legs.map((leg) => leg.co2eKg),
    input.planTotalCo2e,
  );

  // Info: (20260731 - Tzuhan) 係數來源逐一列出:查核者要能自行以公開係數重算每一格
  const sources = Array.from(
    new Set(input.legs.map((leg) => FACTOR_SOURCE_BY_MODE[leg.mode])),
  )
    .map((source) => escapeHtml(source))
    .join(" · ");

  const mapBlock = renderMapFigure({
    dataUrl: input.mapImageDataUrl,
    metersPerPixel: input.metersPerPixel,
    captureWidthPx: input.captureWidthPx,
    captureHeightPx: input.captureHeightPx,
    captureLatSouthDeg: input.captureLatSouthDeg,
    captureLatNorthDeg: input.captureLatNorthDeg,
    caption: `${escapeHtml(input.originLabel)} → ${escapeHtml(input.destLabel)}(全程)`,
  });

  /**
   * Info: (20260731 - Tzuhan) 逐段路徑圖。實測回報:只有一張全程圖時,
   * 市區→機場、機場→市區的接駁段在圖上看不到,報告就無法作為那兩段的證據。
   * 缺圖的段仍列出標題與說明,不靜默跳過 —— 讀者要知道是「沒有圖」而不是「沒有這段」。
   */
  const legFigures = input.legs
    .map((leg, index) =>
      renderMapFigure({
        dataUrl: leg.mapImageDataUrl,
        metersPerPixel: leg.metersPerPixel,
        captureWidthPx: leg.captureWidthPx,
        captureHeightPx: leg.captureHeightPx,
        captureLatSouthDeg: leg.captureLatSouthDeg,
        captureLatNorthDeg: leg.captureLatNorthDeg,
        caption: `${index + 1}. ${escapeHtml(leg.fromName)} → ${escapeHtml(leg.toName)}(${leg.mode})`,
        compact: true,
      }),
    )
    .join("\n");

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
  /* Info: (20260731 - Tzuhan) contain 而非 cover:cover 會裁掉圖的邊緣,而被裁掉的正是路線端點,
     實測回報「路線圖被裁掉不完整,無法成為證據」即此。寧可留白也不可裁切證據。 */
  .map { display: block; width: 100%; height: 100%; object-fit: contain; background: #f8fafc; border: 0.3mm solid #e2e8f0; border-radius: 1.5mm; }
  .figure { margin: 0 0 3mm; break-inside: avoid; }
  .figure figcaption { font-size: 7.5pt; color: #64748b; margin-top: 1mm; }
  /* Info: (20260801 - Luphia) 比例尺的定位基準必須是「影像」而不是「整個 figure」:
     figure 還包含 figcaption,以它為基準時 bottom 會把比例尺推到圖說上,而不是圖內。
     .mapbox 的尺寸由 computeRenderedMapSizeMm 決定性算出並寫在 style 屬性上,
     與影像實際被畫出的大小完全一致,contain 因此不會留白。 */
  .mapbox { position: relative; margin: 0 auto; max-width: 100%; }
  /* Info: (20260801 - Luphia) 尺寸算不出來時的退路:回到自適應高度,此時不畫比例尺 */
  .mapbox:not([style]) { height: ${LOGISTICS_PDF_MAP_MAX_HEIGHT_MM}mm; }
  .figure.compact .mapbox:not([style]) { height: ${LOGISTICS_PDF_LEG_MAP_MAX_HEIGHT_MM}mm; }
  .scalebar { position: absolute; bottom: 2mm; left: 2mm; background: rgba(255,255,255,0.88); border: 0.2mm solid #cbd5e1; border-radius: 0.8mm; padding: 0.6mm 1.2mm; font-size: 6.5pt; color: #334155; line-height: 1.1; }
  /* Info: (20260801 - Luphia) 線段畫在文字上方:讀者的視線先落在線段兩端,再讀數字。
     兩端的短豎線標出量測起訖 —— 沒有端點的線段讀不出「從哪量到哪」。 */
  .scalebar .bar { display: block; height: 1.2mm; border: 0.25mm solid #334155; border-top: none; }
  .scalebar .tick { display: block; text-align: center; margin-top: 0.3mm; }
  /* Info: (20260801 - Luphia) 未標示比例尺的原因:字級小但不可省,讀者要能分辨刻意與缺件 */
  .scalenote { font-size: 7pt; margin: 1mm 0 0; }
  .section { font-size: 10pt; margin: 5mm 0 2mm; padding-top: 2mm; border-top: 0.2mm solid #e2e8f0; }
  /* Info: (20260801 - Luphia) gap 由常數插入:它同時決定逐段小圖的顯示寬度,
     兩處若各自寫死就會失去同步,而比例尺長度直接建立在那個寬度上 */
  .legmaps { display: grid; grid-template-columns: 1fr 1fr; gap: ${LOGISTICS_PDF_LEG_MAP_GAP_MM}mm; }
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
  /* Info: (20260801 - Luphia) 勾稽揭露緊接公式,不再畫一條分隔線(視覺上屬同一段說明) */
  .formula.recon { margin-top: 1.5mm; padding-top: 0; border-top: none; }
  /* Info: (20260801 - Luphia) 超出捨入範圍時提高視覺權重:這是查核者必須注意的一項,不可與一般註腳同級 */
  .formula.recon.warn { color: #b45309; font-weight: 700; }
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
  <h2 class="section">逐段路徑圖</h2>
  <div class="legmaps">
${legFigures}
  </div>
  <div class="formula">
    Leg CO2e = Distance × (Weight / 1000) × Factor ·
    Factors (kg CO2e/t-km): LAND ${EMISSION_FACTORS.LAND} | SEA ${EMISSION_FACTORS.SEA} | AIR ${EMISSION_FACTORS.AIR} ·
    ${sources} ·
    est. = 直線距離 × 1.2 推估(該段無路網資料)
  </div>
  ${renderReconciliationNote(reconciliation)}
</body>
</html>`;
}
