// Info: (20260724 - Tzuhan) 總結報表(CSV)生成與 legacy 歷史資料重建(需求三)
// Info: (20260724 - Tzuhan) 原 page.tsx 的 CSV 把海運方案的陸運接駁段距離混入「Sea Distance」、
// Info: (20260724 - Tzuhan) 「Sea Emission」又是含陸段的方案總計,欄名與數值互相矛盾;本模組改為按方案分欄、逐段展開,
// Info: (20260724 - Tzuhan) 每格皆可用公開係數重算驗證(可追溯性),不適用方案輸出 N/A 而非誤導性的 0

import type { Geometry } from "geojson";
import { ILogisticsPlan, ITransportSegment } from "@/interfaces/logistics";
import { IMileageBatchResult } from "@/components/transportation_carbon_footprint_calculator/mileage_batch_results";
import { getRouteApplicability } from "@/lib/utils/route_applicability";
import { MoneyUtil } from "@/lib/utils/money";
import { EMISSION_FACTORS } from "@/constants/logistics";

const NOT_APPLICABLE = "N/A";

/**
 * Info: (20260724 - Tzuhan) 舊版批次結果沒有完整 plan,僅存距離與 geometry 字串
 */
export interface ILegacyBatchItem extends IMileageBatchResult {
  distanceKm?: number;
  landDistanceKm?: number;
  seaDistanceKm?: number;
  airDistanceKm?: number;
  landGeometry?: string;
  routeGeometry?: string;
  seaGeometry?: string;
  airGeometry?: string;
  emissions?: string;
}

const parseGeo = (geoStr: string | null | undefined): Geometry | null => {
  if (!geoStr) return null;
  try {
    return typeof geoStr === "string" ? JSON.parse(geoStr) : geoStr;
  } catch {
    return null;
  }
};

/**
 * Info: (20260724 - Tzuhan) 從 legacy 批次項目重建 ILogisticsPlan(page.tsx handleLoadHistory 抽出)
 * 修正兩個既存錯誤:
 * 1. 原本硬編碼 SEA 0.01614 / AIR 0.50422,與後端 route.service 的 0.01045 / 0.6023 矛盾,
 *    同一路線由前端 fallback 重算會得出不同碳排 → 一律改用 EMISSION_FACTORS 單一來源
 * 2. 原本用原生 number 浮點乘法,改用 Decimal(對齊後端與高精度數值鐵律)
 */
export function buildPlanFromLegacyBatchItem(
  bItem: ILegacyBatchItem,
  weightKg: number | string,
): ILogisticsPlan {
  const weightTons = MoneyUtil.toDecimal(Number(weightKg) || 1000).dividedBy(
    1000,
  );

  const landDist = bItem.landDistanceKm || bItem.distanceKm || 0;
  const seaDist = bItem.seaDistanceKm || 0;
  const airDist = bItem.airDistanceKm || 0;

  const landCo2e = MoneyUtil.toDecimal(landDist)
    .times(weightTons)
    .times(EMISSION_FACTORS.LAND);
  const seaCo2e = MoneyUtil.toDecimal(seaDist)
    .times(weightTons)
    .times(EMISSION_FACTORS.SEA);
  const airCo2e = MoneyUtil.toDecimal(airDist)
    .times(weightTons)
    .times(EMISSION_FACTORS.AIR);

  return {
    comparisonData: {
      success: true,
      plans: {
        landOnly: {
          success: !!landDist && !seaDist && !airDist,
          distanceKm: landDist,
          co2eKg: landCo2e.toFixed(2),
          geometry: parseGeo(bItem.landGeometry || bItem.routeGeometry),
        },
        sea_multimodal: {
          // Info: (20260724 - Tzuhan) legacy 資料未拆分接駁段,合計陸運距離歸入第一段,確保「各段相加=方案總計」勾稽成立
          land_origin_to_port:
            seaDist && landDist
              ? {
                  success: true,
                  distanceKm: landDist,
                  co2eKg: landCo2e.toFixed(2),
                  geometry: null,
                }
              : { success: false, geometry: null },
          sea_port_to_port: {
            success: !!seaDist,
            distanceKm: seaDist,
            co2eKg: seaCo2e.toFixed(2),
            geometry: parseGeo(bItem.seaGeometry),
          },
          land_port_to_dest: { success: false, geometry: null },
          total_co2eKg: landCo2e.plus(seaCo2e).toFixed(2),
        },
        air_multimodal: {
          land_origin_to_airport:
            airDist && landDist
              ? {
                  success: true,
                  distanceKm: landDist,
                  co2eKg: landCo2e.toFixed(2),
                  geometry: null,
                }
              : { success: false, geometry: null },
          air_airport_to_airport: {
            success: !!airDist,
            distanceKm: airDist,
            co2eKg: airCo2e.toFixed(2),
            geometry: parseGeo(bItem.airGeometry),
          },
          land_airport_to_dest: { success: false, geometry: null },
          total_co2eKg: landCo2e.plus(airCo2e).toFixed(2),
        },
      },
    },
  } as unknown as ILogisticsPlan;
}

/**
 * Info: (20260724 - Tzuhan) CSV 欄位跳脫:含逗號/引號/換行的值以雙引號包裹(原實作未跳脫,地址含逗號會錯位)
 */
const escapeCsv = (value: string): string => {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const formatLocation = (
  loc: string | { lat: number; lng: number; name?: string },
): string => {
  if (typeof loc === "string") return loc;
  if (loc && typeof loc === "object" && "lat" in loc && "lng" in loc) {
    return loc.name || `${loc.lat}, ${loc.lng}`;
  }
  return "";
};

const formatDistance = (distanceKm?: number): string =>
  MoneyUtil.toDecimal(distanceKm || 0).toFixed(2);

// Info: (20260728 - Tzuhan) issue 07:直線 fallback 估算距離以 * 後綴標示(檔頭 # 行說明),估算值不得偽裝成確定值
const formatLegDistance = (leg?: ITransportSegment): string =>
  `${MoneyUtil.toDecimal(leg?.distanceKm || 0).toFixed(2)}${leg?.isFallback ? "*" : ""}`;

const formatCo2e = (co2eKg?: string | number): string =>
  co2eKg === undefined || co2eKg === null ? "0" : String(co2eKg);

/**
 * Info: (20260724 - Tzuhan) 批次總結報表:按方案分欄、逐段展開(需求三)
 * - 每列一條路線;純陸運 / 海陸聯運 / 空陸聯運 / 自訂聯運各自獨立欄組,禁止交叉混雜
 * - 混合方案的陸運接駁段(起站→港口、港口→迄站)逐段揭露距離與碳排,數據可追溯
 * - 不適用方案(適用性引擎判定)整組輸出 N/A
 * - 檔頭以 # 行揭露公式與係數(單一來源 EMISSION_FACTORS),單看 CSV 即可重算每格
 */
export function buildBatchSummaryCsv(
  results: IMileageBatchResult[],
  indices: number[],
  filesByRouteIndex: Map<number, string[]>,
  weightKg: number | string,
): string {
  const weight = Number(weightKg) || 1000;

  const metaLine =
    `# Formula: CO2e(kg) = distance(km) x weight(t) x factor; ` +
    `Factors (kg CO2e/t-km): LAND ${EMISSION_FACTORS.LAND}, SEA ${EMISSION_FACTORS.SEA}, AIR ${EMISSION_FACTORS.AIR}; ` +
    `Source: UK DEFRA 2025; Weight: ${weight} kg; ` +
    `* = estimated distance (road network data unavailable; straight-line x 1.2)`;

  const header = [
    "Origin",
    "Destination",
    "Weight (kg)",
    "Land Only: Distance (km)",
    "Land Only: CO2e (kg)",
    "Sea Plan: Land Leg Origin->Port (km)",
    "Sea Plan: Land Leg Origin->Port CO2e (kg)",
    "Sea Plan: Sea Leg Port->Port (km)",
    "Sea Plan: Sea Leg Port->Port CO2e (kg)",
    "Sea Plan: Land Leg Port->Dest (km)",
    "Sea Plan: Land Leg Port->Dest CO2e (kg)",
    "Sea Plan: Total CO2e (kg)",
    "Air Plan: Land Leg Origin->Airport (km)",
    "Air Plan: Land Leg Origin->Airport CO2e (kg)",
    "Air Plan: Air Leg Airport->Airport (km)",
    "Air Plan: Air Leg Airport->Airport CO2e (kg)",
    "Air Plan: Land Leg Airport->Dest (km)",
    "Air Plan: Land Leg Airport->Dest CO2e (kg)",
    "Air Plan: Total CO2e (kg)",
    "Custom Plan: Total Distance (km)",
    "Custom Plan: Total CO2e (kg)",
    "Report Files",
  ].join(",");

  const rows = indices.map((index) => {
    const item = results[index];
    if (!item) return "";
    const plans = item.plan?.comparisonData?.plans;
    const applicability = getRouteApplicability(item.plan);

    const landCells = applicability.land
      ? [
          formatLegDistance(plans?.landOnly),
          formatCo2e(plans?.landOnly?.co2eKg),
        ]
      : [NOT_APPLICABLE, NOT_APPLICABLE];

    const seaPlan = plans?.sea_multimodal;
    const seaCells = applicability.sea
      ? [
          formatLegDistance(seaPlan?.land_origin_to_port),
          formatCo2e(seaPlan?.land_origin_to_port?.co2eKg),
          formatLegDistance(seaPlan?.sea_port_to_port),
          formatCo2e(seaPlan?.sea_port_to_port?.co2eKg),
          formatLegDistance(seaPlan?.land_port_to_dest),
          formatCo2e(seaPlan?.land_port_to_dest?.co2eKg),
          formatCo2e(seaPlan?.total_co2eKg),
        ]
      : Array<string>(7).fill(NOT_APPLICABLE);

    const airPlan = plans?.air_multimodal;
    const airCells = applicability.air
      ? [
          formatLegDistance(airPlan?.land_origin_to_airport),
          formatCo2e(airPlan?.land_origin_to_airport?.co2eKg),
          formatLegDistance(airPlan?.air_airport_to_airport),
          formatCo2e(airPlan?.air_airport_to_airport?.co2eKg),
          formatLegDistance(airPlan?.land_airport_to_dest),
          formatCo2e(airPlan?.land_airport_to_dest?.co2eKg),
          formatCo2e(airPlan?.total_co2eKg),
        ]
      : Array<string>(7).fill(NOT_APPLICABLE);

    const customPlan = plans?.custom_multimodal;
    const customCells = applicability.custom
      ? [
          formatDistance(customPlan?.total_distanceKm),
          formatCo2e(customPlan?.total_co2eKg),
        ]
      : [NOT_APPLICABLE, NOT_APPLICABLE];

    return [
      escapeCsv(formatLocation(item.origin)),
      escapeCsv(formatLocation(item.dest)),
      String(weight),
      ...landCells,
      ...seaCells,
      ...airCells,
      ...customCells,
      escapeCsv((filesByRouteIndex.get(index) || []).join("; ")),
    ].join(",");
  });

  // Info: (20260724 - Tzuhan) BOM 讓 Excel 正確辨識 UTF-8
  return ["\uFEFF" + metaLine, header, ...rows.filter(Boolean)].join("\n");
}
