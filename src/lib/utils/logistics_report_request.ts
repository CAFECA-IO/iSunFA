// Info: (20260731 - Tzuhan) 匯出請求建構器:批次結果 → 伺服端列印 API 的載荷(純函數)
// Info: (20260731 - Tzuhan) 見 issue 08。這一層存在的理由是把「要送什麼」與「怎麼送」分開:
// Info: (20260731 - Tzuhan) 前端匯出流程涉及 WebGL 截圖與 DOM 操作,沙箱與 CI 都無法執行;
// Info: (20260731 - Tzuhan) 但「送出去的數字對不對」是這個功能的正確性核心,必須可被單元測試。
// Info: (20260731 - Tzuhan) 逐段資料與方案總計皆取自 CSV 已在用的 buildPlanLegs / getPlanTotalCo2e,
// Info: (20260731 - Tzuhan) 不在此重新推導 —— 否則同一條路線會在 CSV 與 PDF 上出現兩套數字。

import type { IMileageBatchResult } from "@/components/transportation_carbon_footprint_calculator/mileage_batch_results";
import {
  buildPlanLegs,
  getPlanTotalCo2e,
  PLAN_LABELS,
  type ILogisticsPlanKey,
} from "@/lib/utils/logistics_report";
import { getRouteApplicability } from "@/lib/utils/route_applicability";
import { buildPlanCode } from "@/constants/logistics";
import { buildExportFileName } from "@/lib/utils/pdf_export";
import type { IReportLeg } from "@/lib/utils/logistics_report_html";
import type { ILogisticsReportPdfItem } from "@/validators";

/**
 * Info: (20260731 - Tzuhan) 匯出時的方案展開順序。與批次匯出既有的順序一致(custom 優先),
 * 使 zip 內的檔案排列與 summary.csv 的列序相同 —— 使用者是照這個順序對照的。
 */
export const EXPORT_PLAN_ORDER: readonly ILogisticsPlanKey[] = [
  "custom",
  "land",
  "sea",
  "air",
  "seaLandAir",
] as const;

/**
 * Info: (20260731 - Tzuhan) 地點標籤:與檔名產生器使用同一份規則(物件取 name,退回經緯度)
 */
export function getLocationLabel(
  loc: string | { lat: number; lng: number; name?: string },
): string {
  if (typeof loc === "string") return loc;
  if (loc && typeof loc === "object" && "lat" in loc && "lng" in loc) {
    return loc.name || `${loc.lat}_${loc.lng}`;
  }
  return "";
}

export interface IBuildReportItemInput {
  item: IMileageBatchResult;
  routeIndex: number;
  planKey: ILogisticsPlanKey;
  /** Info: (20260731 - Tzuhan) 批次參數的重量,僅在該筆結果自身缺漏時使用(issue 08 的同一條規則) */
  fallbackWeightKg: number | string;
  /** Info: (20260731 - Tzuhan) 前端截下的全程地圖 JPEG data URL;無地圖時報告仍成立 */
  mapImageDataUrl?: string;
  /** Info: (20260731 - Tzuhan) 全程圖的每像素公尺數(比例尺用) */
  metersPerPixel?: number;
  /** Info: (20260801 - Luphia) 全程圖截圖畫布的 CSS 尺寸(比例尺與紙面尺寸用) */
  captureWidthPx?: number;
  captureHeightPx?: number;
  /** Info: (20260801 - Luphia) 全程圖視野的南北緯度界(Mercator 比例尺護欄用) */
  captureLatSouthDeg?: number;
  captureLatNorthDeg?: number;
  /** Info: (20260801 - Luphia) 是否計算二氧化碳當量;false 時輸出純距離報告 */
  includeCo2e?: boolean;
  /**
   * Info: (20260731 - Tzuhan) 逐段路徑圖,索引對齊 buildPlanLegs 的順序。
   * 只有全程圖時,市區→機場、機場→市區的接駁段在圖上看不到,那兩段就沒有證據。
   */
  legCaptures?: (ILegCapture | null)[];
}

export interface ILegCapture {
  dataUrl: string;
  metersPerPixel: number;
  /** Info: (20260801 - Luphia) 截圖畫布的 CSS 尺寸,與 metersPerPixel 同基準(見 IMapCapture) */
  widthPx?: number;
  heightPx?: number;
  /** Info: (20260801 - Luphia) 截圖視野的南北緯度界,用於判定單一比例尺是否成立 */
  latSouthDeg?: number;
  latNorthDeg?: number;
}

/**
 * Info: (20260731 - Tzuhan) 比例尺數值的收斂點。
 * 截圖端在畫布寬度為 0 等退化情況會回 0,而 API validator 要求正數 —— 送出 0 會讓
 * **整批請求被 400 擋掉**(實測踩過:為了滿足型別而填 0,結果錯誤在更遠的地方才爆)。
 * 這裡是載荷的邊界,把無效值一律轉成「沒有這個欄位」:沒有比例尺只是少一個刻度,
 * 送出 0 卻會讓整批報告拿不到。
 */
const sanitizePositive = (value?: number): number | undefined =>
  value !== undefined && Number.isFinite(value) && value > 0
    ? value
    : undefined;

/**
 * Info: (20260801 - Luphia) 緯度的收斂點。**不可套用 sanitizePositive** ——
 * 緯度合法值含 0(赤道)與負數(南半球),用「正數」過濾會把它們當成無效值丟掉,
 * 結果是南半球與赤道附近的路線一律失去比例尺。
 */
const sanitizeLatitude = (value?: number): number | undefined =>
  value !== undefined && Number.isFinite(value) && Math.abs(value) <= 90
    ? value
    : undefined;

/**
 * Info: (20260731 - Tzuhan) 組出單一 (路線, 方案) 的請求項。
 * 無逐段資料(方案不適用)時回 null —— 與 CSV 「不適用方案不產生列」的行為一致,
 * 不產生一份沒有內容的 PDF。
 */
export function buildReportPdfItem(
  input: IBuildReportItemInput,
): ILogisticsReportPdfItem | null {
  const {
    item,
    routeIndex,
    planKey,
    fallbackWeightKg,
    mapImageDataUrl,
    metersPerPixel,
    captureWidthPx,
    captureHeightPx,
    captureLatSouthDeg,
    captureLatNorthDeg,
    includeCo2e,
    legCaptures,
  } = input;
  const legs = buildPlanLegs(item, planKey);
  if (legs.length === 0) return null;

  const originLabel = getLocationLabel(item.origin);
  const destLabel = getLocationLabel(item.dest);

  const reportLegs: IReportLeg[] = legs.map((leg, legIndex) => ({
    mode: leg.mode,
    fromName: leg.fromName,
    toName: leg.toName,
    fromLat: leg.fromLat,
    fromLng: leg.fromLng,
    toLat: leg.toLat,
    toLng: leg.toLng,
    distanceKm: leg.segment?.distanceKm,
    co2eKg: leg.segment?.co2eKg,
    isFallback: leg.segment?.isFallback,
    mapImageDataUrl: legCaptures?.[legIndex]?.dataUrl,
    metersPerPixel: sanitizePositive(legCaptures?.[legIndex]?.metersPerPixel),
    captureWidthPx: sanitizePositive(legCaptures?.[legIndex]?.widthPx),
    captureHeightPx: sanitizePositive(legCaptures?.[legIndex]?.heightPx),
    // Info: (20260801 - Luphia) 緯度可為 0 或負數,不可用 sanitizePositive 過濾
    captureLatSouthDeg: sanitizeLatitude(legCaptures?.[legIndex]?.latSouthDeg),
    captureLatNorthDeg: sanitizeLatitude(legCaptures?.[legIndex]?.latNorthDeg),
  }));

  return {
    planCode: buildPlanCode(routeIndex, planKey),
    fileName: buildExportFileName(routeIndex, planKey, originLabel, destLabel),
    // Info: (20260731 - Tzuhan) 路線標籤沿用 CSV 的 Route 欄語意(1-based 序號)
    routeLabel: `Route ${routeIndex + 1}`,
    planLabel: PLAN_LABELS[planKey],
    originLabel,
    destLabel,
    weightKg: String(Number(item.weightKg) || Number(fallbackWeightKg) || 1000),
    planTotalCo2e: getPlanTotalCo2e(item, planKey),
    legs: reportLegs,
    mapImageDataUrl,
    metersPerPixel: sanitizePositive(metersPerPixel),
    captureWidthPx: sanitizePositive(captureWidthPx),
    captureHeightPx: sanitizePositive(captureHeightPx),
    captureLatSouthDeg: sanitizeLatitude(captureLatSouthDeg),
    captureLatNorthDeg: sanitizeLatitude(captureLatNorthDeg),
    includeCo2e,
  };
}

export interface IBuildReportRequestInput {
  results: IMileageBatchResult[];
  /** Info: (20260731 - Tzuhan) 使用者勾選的路線索引 */
  indices: number[];
  /** Info: (20260731 - Tzuhan) 使用者勾選的方案 */
  selectedPlans: Set<string>;
  fallbackWeightKg: number | string;
  /**
   * Info: (20260731 - Tzuhan) 逐 (路線, 方案) 取得的地圖素材(全程圖 + 逐段圖);
   * 缺項即該份不附地圖,報告仍成立並在圖說處明示。
   */
  mapCaptures?: Map<string, IPlanMapCapture>;
  /** Info: (20260801 - Luphia) 是否計算二氧化碳當量(使用者於匯出選單勾選) */
  includeCo2e?: boolean;
}

export interface IPlanMapCapture {
  overview?: ILegCapture | null;
  legs?: (ILegCapture | null)[];
}

/**
 * Info: (20260731 - Tzuhan) 展開整批請求項。
 * 只納入「使用者勾選 ∩ 該路線適用」的方案——適用性由決定論引擎裁決,
 * 不因為使用者勾了就產生一份不成立的報告。
 */
export function buildReportPdfItems(
  input: IBuildReportRequestInput,
): ILogisticsReportPdfItem[] {
  const items: ILogisticsReportPdfItem[] = [];
  input.indices.forEach((routeIndex) => {
    const item = input.results[routeIndex];
    if (!item) return;
    const applicability = getRouteApplicability(item.plan);
    EXPORT_PLAN_ORDER.forEach((planKey) => {
      if (!input.selectedPlans.has(planKey)) return;
      if (!applicability[planKey]) return;
      const captured = input.mapCaptures?.get(
        buildMapImageKey(routeIndex, planKey),
      );
      const built = buildReportPdfItem({
        item,
        routeIndex,
        planKey,
        fallbackWeightKg: input.fallbackWeightKg,
        mapImageDataUrl: captured?.overview?.dataUrl,
        metersPerPixel: captured?.overview?.metersPerPixel,
        captureWidthPx: captured?.overview?.widthPx,
        captureHeightPx: captured?.overview?.heightPx,
        captureLatSouthDeg: captured?.overview?.latSouthDeg,
        captureLatNorthDeg: captured?.overview?.latNorthDeg,
        includeCo2e: input.includeCo2e,
        legCaptures: captured?.legs,
      });
      if (built) items.push(built);
    });
  });
  return items;
}

/**
 * Info: (20260731 - Tzuhan) 地圖影像的索引鍵:(路線, 方案) 對一張圖。
 * 同一條路線的不同方案走不同路徑,共用一張地圖會讓報告與圖不符。
 */
export const buildMapImageKey = (
  routeIndex: number,
  planKey: ILogisticsPlanKey,
): string => `${routeIndex}:${planKey}`;

/**
 * Info: (20260731 - Tzuhan) 分批切割:每批獨立請求。
 * 理由有三:單次載荷更小、進度條仍有粒度可更新、某批失敗只需重試該批。
 * 一次送 27 份雖然可行(伺服端上限 60),但使用者會盯著一個沒有進展的轉圈。
 */
export function chunkReportItems<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
