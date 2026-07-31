// Info: (20260724 - Tzuhan) 總結報表(CSV)生成與 legacy 歷史資料重建(需求三)
// Info: (20260724 - Tzuhan) 原 page.tsx 的 CSV 把海運方案的陸運接駁段距離混入「Sea Distance」、
// Info: (20260724 - Tzuhan) 「Sea Emission」又是含陸段的方案總計,欄名與數值互相矛盾;本模組改為按方案分欄、逐段展開,
// Info: (20260724 - Tzuhan) 每格皆可用公開係數重算驗證(可追溯性),不適用方案輸出 N/A 而非誤導性的 0

import type { Geometry } from "geojson";
import { ILogisticsPlan, ITransportSegment } from "@/interfaces/logistics";
import { IMileageBatchResult } from "@/components/transportation_carbon_footprint_calculator/mileage_batch_results";
import { getRouteApplicability } from "@/lib/utils/route_applicability";
import { MoneyUtil } from "@/lib/utils/money";
import {
  EMISSION_FACTORS,
  EMISSION_FACTOR_SOURCES,
  buildPlanCode,
} from "@/constants/logistics";
import { ROUTE_MODE } from "@/constants/analysis";

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
 * Info: (20260728 - Tzuhan) issue 09:批次清單標頭碳排徽章的單一取值來源。
 * 舊邏輯只讀 custom || landOnly,聯運路線的 landOnly.co2eKg 為 "0" → 徽章恆顯示 0。
 * 優先序:custom 方案 → item.mode 對應方案總計 → 適用性引擎的第一個適用方案;
 * isEstimated:所選方案含直線 fallback 段(徽章加 ~ 前綴,估算值不偽裝確定值)
 */
export interface IHeadlineCo2e {
  value: string;
  isEstimated: boolean;
}

export function getHeadlineCo2e(
  item: IMileageBatchResult,
): IHeadlineCo2e | null {
  const plans = item.plan?.comparisonData?.plans;
  if (!plans) return null;

  const seaLegs = [
    plans.sea_multimodal?.land_origin_to_port,
    plans.sea_multimodal?.sea_port_to_port,
    plans.sea_multimodal?.land_port_to_dest,
  ];
  const airLegs = [
    plans.air_multimodal?.land_origin_to_airport,
    plans.air_multimodal?.air_airport_to_airport,
    plans.air_multimodal?.land_airport_to_dest,
  ];

  type Candidate = {
    value?: string | number;
    legs: (ITransportSegment | undefined)[];
  };
  const landCandidate: Candidate = {
    value: plans.landOnly?.co2eKg,
    legs: [plans.landOnly],
  };
  const seaCandidate: Candidate = {
    value: plans.sea_multimodal?.total_co2eKg,
    legs: seaLegs,
  };
  const airCandidate: Candidate = {
    value: plans.air_multimodal?.total_co2eKg,
    legs: airLegs,
  };
  const seaLandAirCandidate: Candidate = {
    value: plans.sea_land_air_multimodal?.total_co2eKg,
    legs: [
      plans.sea_land_air_multimodal?.land_origin_to_port,
      plans.sea_land_air_multimodal?.sea_port_to_port,
      plans.sea_land_air_multimodal?.land_port_to_airport,
      plans.sea_land_air_multimodal?.air_airport_to_airport,
      plans.sea_land_air_multimodal?.land_airport_to_dest,
    ],
  };

  let chosen: Candidate | null = null;
  if (plans.custom_multimodal) {
    // Info: (20260728 - Tzuhan) 自訂聯運存在時優先(沿用舊行為);custom 段的 fallback 旗標一併檢查
    chosen = {
      value: plans.custom_multimodal.total_co2eKg,
      legs: plans.custom_multimodal.segments ?? [],
    };
  } else if (item.mode === ROUTE_MODE.LAND) {
    chosen = landCandidate;
  } else if (item.mode === ROUTE_MODE.SEA_LAND) {
    chosen = seaCandidate;
  } else if (item.mode === ROUTE_MODE.AIR_LAND) {
    chosen = airCandidate;
  } else if (item.mode === ROUTE_MODE.SEA_LAND_AIR) {
    // Info: (20260729 - Tzuhan) issue 10:三模式串聯方案有自己的總計,不再誤用空運方案
    chosen = seaLandAirCandidate;
  }

  // Info: (20260728 - Tzuhan) 無 mode(或 mode 對應方案無值)時,依適用性引擎取第一個適用方案
  if (!chosen || chosen.value === undefined || chosen.value === null) {
    const applicability = getRouteApplicability(item.plan);
    if (applicability.land) chosen = landCandidate;
    else if (applicability.sea) chosen = seaCandidate;
    else if (applicability.air) chosen = airCandidate;
    else if (applicability.seaLandAir) chosen = seaLandAirCandidate;
    else chosen = null;
  }

  if (!chosen || chosen.value === undefined || chosen.value === null) {
    return null;
  }
  return {
    value: String(chosen.value),
    isEstimated: chosen.legs.some((legItem) => legItem?.isFallback),
  };
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

const formatCo2e = (co2eKg?: string | number): string =>
  co2eKg === undefined || co2eKg === null ? "0" : String(co2eKg);

/**
 * Info: (20260729 - Tzuhan) 批次總結報表 long format(issue 11:需求三透明化改版)
 * - 同一條路線的多個方案「換行分列」:每個方案的每一段各佔一列,不再橫向擴充欄位
 *   (寬表在方案擴充後會破 30 欄,且不適用方案留下大量 N/A;long format 欄位固定、可樞紐分析)
 * - 每列自我完備:模式、起訖點名稱與經緯度、距離、逐段係數與來源、該段碳排 → 任一段可獨立重算與地理追溯
 * - 方案總計於該方案最後一段的 Plan Total 欄呈現,維持「各段相加 = 方案總計」勾稽
 * - 不適用方案(適用性引擎判定)不產生列;fallback 段以 Estimated? = Y 標示(取代 * 後綴)
 */
type CsvLeg = {
  mode: "LAND" | "SEA" | "AIR";
  fromName: string;
  fromLat?: number;
  fromLng?: number;
  toName: string;
  toLat?: number;
  toLng?: number;
  segment?: ITransportSegment;
};

const FACTOR_BY_MODE: Record<CsvLeg["mode"], string> = {
  LAND: EMISSION_FACTORS.LAND,
  SEA: EMISSION_FACTORS.SEA,
  AIR: EMISSION_FACTORS.AIR,
};

const FACTOR_SOURCE_BY_MODE: Record<CsvLeg["mode"], string> = {
  LAND: EMISSION_FACTOR_SOURCES.LAND,
  SEA: EMISSION_FACTOR_SOURCES.SEA,
  AIR: EMISSION_FACTOR_SOURCES.AIR,
};

const formatCoord = (value?: number): string =>
  value === undefined || value === null ? "" : String(value);

// Info: (20260729 - Tzuhan) 端點座標:字串地點無座標可揭露(留空),物件則輸出 lat/lng
const pointOf = (
  loc: string | { lat: number; lng: number; name?: string },
): { name: string; lat?: number; lng?: number } => {
  if (typeof loc === "string") return { name: loc };
  if (loc && typeof loc === "object" && "lat" in loc && "lng" in loc) {
    return {
      name: loc.name || `${loc.lat}, ${loc.lng}`,
      lat: loc.lat,
      lng: loc.lng,
    };
  }
  return { name: "" };
};

const nodeOf = (
  node: { name?: string; lat?: number; lng?: number } | null | undefined,
  fallbackName: string,
): { name: string; lat?: number; lng?: number } => ({
  name: node?.name || fallbackName,
  lat: node?.lat,
  lng: node?.lng,
});

/**
 * Info: (20260731 - Tzuhan) 逐段清單的對外型別:CSV 與列印用 HTML 共用同一份逐段推導,
 * 兩個渲染器不各自算一次,否則同一條路線在 CSV 與 PDF 上會出現不一致的數字。
 */
export type IPlanLeg = CsvLeg;

export type ILogisticsPlanKey =
  | "land"
  | "sea"
  | "air"
  | "seaLandAir"
  | "custom";

/**
 * Info: (20260729 - Tzuhan) 依方案組出逐段清單(端點取自 plan 的港口/機場節點,含經緯度)
 */
export const buildPlanLegs = (
  item: IMileageBatchResult,
  planKey: "land" | "sea" | "air" | "seaLandAir" | "custom",
): CsvLeg[] => {
  const plan = item.plan;
  const plans = plan?.comparisonData?.plans;
  if (!plans) return [];
  const origin = pointOf(item.origin);
  const dest = pointOf(item.dest);

  if (planKey === "land") {
    return [
      {
        mode: "LAND",
        fromName: origin.name,
        fromLat: origin.lat,
        fromLng: origin.lng,
        toName: dest.name,
        toLat: dest.lat,
        toLng: dest.lng,
        segment: plans.landOnly,
      },
    ];
  }

  if (planKey === "sea") {
    const seaPlan = plans.sea_multimodal;
    const outPort = nodeOf(plan?.exportPort, "Export Port");
    const inPort = nodeOf(plan?.importPort, "Import Port");
    return [
      {
        mode: "LAND",
        fromName: origin.name,
        fromLat: origin.lat,
        fromLng: origin.lng,
        toName: outPort.name,
        toLat: outPort.lat,
        toLng: outPort.lng,
        segment: seaPlan?.land_origin_to_port,
      },
      {
        mode: "SEA",
        fromName: outPort.name,
        fromLat: outPort.lat,
        fromLng: outPort.lng,
        toName: inPort.name,
        toLat: inPort.lat,
        toLng: inPort.lng,
        segment: seaPlan?.sea_port_to_port,
      },
      {
        mode: "LAND",
        fromName: inPort.name,
        fromLat: inPort.lat,
        fromLng: inPort.lng,
        toName: dest.name,
        toLat: dest.lat,
        toLng: dest.lng,
        segment: seaPlan?.land_port_to_dest,
      },
    ];
  }

  if (planKey === "air") {
    const airPlan = plans.air_multimodal;
    const outAirport = nodeOf(plan?.exportAirport, "Export Airport");
    const inAirport = nodeOf(plan?.importAirport, "Import Airport");
    return [
      {
        mode: "LAND",
        fromName: origin.name,
        fromLat: origin.lat,
        fromLng: origin.lng,
        toName: outAirport.name,
        toLat: outAirport.lat,
        toLng: outAirport.lng,
        segment: airPlan?.land_origin_to_airport,
      },
      {
        mode: "AIR",
        fromName: outAirport.name,
        fromLat: outAirport.lat,
        fromLng: outAirport.lng,
        toName: inAirport.name,
        toLat: inAirport.lat,
        toLng: inAirport.lng,
        segment: airPlan?.air_airport_to_airport,
      },
      {
        mode: "LAND",
        fromName: inAirport.name,
        fromLat: inAirport.lat,
        fromLng: inAirport.lng,
        toName: dest.name,
        toLat: dest.lat,
        toLng: dest.lng,
        segment: airPlan?.land_airport_to_dest,
      },
    ];
  }

  if (planKey === "seaLandAir") {
    // Info: (20260729 - Tzuhan) issue 10:5 段串聯,中轉機場取自方案自身的 transitAirport
    const slaPlan = plans.sea_land_air_multimodal;
    const outPort = nodeOf(plan?.exportPort, "Export Port");
    const inPort = nodeOf(plan?.importPort, "Import Port");
    const transitAirport = nodeOf(slaPlan?.transitAirport, "Transit Airport");
    const inAirport = nodeOf(plan?.importAirport, "Import Airport");
    return [
      {
        mode: "LAND",
        fromName: origin.name,
        fromLat: origin.lat,
        fromLng: origin.lng,
        toName: outPort.name,
        toLat: outPort.lat,
        toLng: outPort.lng,
        segment: slaPlan?.land_origin_to_port,
      },
      {
        mode: "SEA",
        fromName: outPort.name,
        fromLat: outPort.lat,
        fromLng: outPort.lng,
        toName: inPort.name,
        toLat: inPort.lat,
        toLng: inPort.lng,
        segment: slaPlan?.sea_port_to_port,
      },
      {
        mode: "LAND",
        fromName: inPort.name,
        fromLat: inPort.lat,
        fromLng: inPort.lng,
        toName: transitAirport.name,
        toLat: transitAirport.lat,
        toLng: transitAirport.lng,
        segment: slaPlan?.land_port_to_airport,
      },
      {
        mode: "AIR",
        fromName: transitAirport.name,
        fromLat: transitAirport.lat,
        fromLng: transitAirport.lng,
        toName: inAirport.name,
        toLat: inAirport.lat,
        toLng: inAirport.lng,
        segment: slaPlan?.air_airport_to_airport,
      },
      {
        mode: "LAND",
        fromName: inAirport.name,
        fromLat: inAirport.lat,
        fromLng: inAirport.lng,
        toName: dest.name,
        toLat: dest.lat,
        toLng: dest.lng,
        segment: slaPlan?.land_airport_to_dest,
      },
    ];
  }

  // Info: (20260729 - Tzuhan) custom:段名格式為 "Land: A -> B",以 name 拆出端點(無座標可揭露)
  const customPlan = plans.custom_multimodal;
  return (customPlan?.segments ?? []).map((seg) => {
    const parts = (seg.name || "").split("->");
    return {
      mode: seg.mode === "SEA" ? ("SEA" as const) : ("LAND" as const),
      fromName: parts[0]?.replace(/^(Land|Sea):\s*/, "").trim() || "Point",
      toName: parts[1]?.trim() || "Point",
      segment: seg,
    };
  });
};

export const PLAN_LABELS: Record<ILogisticsPlanKey, string> = {
  land: "Land Only",
  sea: "Sea Multimodal",
  air: "Air Multimodal",
  // Info: (20260729 - Tzuhan) issue 10:海陸空聯運(串聯路徑)
  seaLandAir: "Sea-Land-Air Multimodal",
  custom: "Custom Multimodal",
};

export function buildBatchSummaryCsv(
  results: IMileageBatchResult[],
  indices: number[],
  filesByRouteIndex: Map<number, string[]>,
  weightKg: number | string,
  // Info: (20260729 - Tzuhan) 匯出批次識別碼:與同批 PDF 一致,使跨批次的同名方案代碼可區分
  exportId?: string,
): string {
  // Info: (20260728 - Tzuhan) issue 08:每列用自己的實際計算重量;舊資料缺漏時退回批次參數
  const fallbackWeight = Number(weightKg) || 1000;

  // Info: (20260729 - Tzuhan) 揭露資訊改為多行短註解:單行 600 字的檔頭在 Excel 中會撐爆首格難以閱讀,
  // Info: (20260729 - Tzuhan) 拆成一行一件事後每行自成一列;各行皆不含逗號,避免被切成多欄
  const metaLines = [
    `# iSunFA Transport Carbon Report`,
    ...(exportId ? [`# Export ID: ${exportId}`] : []),
    `# Code: R{route}-{MODE} — the same code appears in the matching PDF's filename and header`,
    `# Formula: Leg CO2e = Distance x (Weight / 1000) x Factor`,
    `# Factors (kg CO2e/t-km): LAND ${EMISSION_FACTORS.LAND} | SEA ${EMISSION_FACTORS.SEA} | AIR ${EMISSION_FACTORS.AIR} — UK DEFRA 2025`,
    `# Units: Weight kg | Distance km | CO2e kg | Lat/Lng WGS84`,
    `# Layout: one row per leg — Plan CO2e and PDF are filled on the plan's last leg only`,
    `# Est. = Y: straight-line x 1.2 estimate (road network data unavailable for that leg)`,
    `# Plans deemed inapplicable for a route produce no rows`,
  ];

  // Info: (20260729 - Tzuhan) 欄名去除單位與贅字(單位統一移到檔頭 Units 行),使 Excel 首列不必拉寬即可通覽
  const header = [
    "Code",
    "Route",
    "Origin",
    "Destination",
    "Weight",
    "Plan",
    "Leg",
    "Mode",
    "From",
    "From Lat",
    "From Lng",
    "To",
    "To Lat",
    "To Lng",
    "Distance",
    "Est.",
    "Factor",
    "Source",
    "Leg CO2e",
    "Plan CO2e",
    "PDF",
  ].join(",");

  const rows: string[] = [];
  indices.forEach((index) => {
    const item = results[index];
    if (!item) return;
    const plans = item.plan?.comparisonData?.plans;
    if (!plans) return;
    const applicability = getRouteApplicability(item.plan);
    const originLabel = escapeCsv(formatLocation(item.origin));
    const destLabel = escapeCsv(formatLocation(item.dest));
    const weight = String(Number(item.weightKg) || fallbackWeight);
    const files = escapeCsv((filesByRouteIndex.get(index) || []).join("; "));

    const planKeys: ("land" | "sea" | "air" | "seaLandAir" | "custom")[] = [];
    if (applicability.custom) planKeys.push("custom");
    if (applicability.land) planKeys.push("land");
    if (applicability.sea) planKeys.push("sea");
    if (applicability.air) planKeys.push("air");
    if (applicability.seaLandAir) planKeys.push("seaLandAir");

    planKeys.forEach((planKey) => {
      const legs = buildPlanLegs(item, planKey);
      if (legs.length === 0) return;
      const planTotal =
        planKey === "land"
          ? plans.landOnly?.co2eKg
          : planKey === "sea"
            ? plans.sea_multimodal?.total_co2eKg
            : planKey === "air"
              ? plans.air_multimodal?.total_co2eKg
              : planKey === "seaLandAir"
                ? plans.sea_land_air_multimodal?.total_co2eKg
                : plans.custom_multimodal?.total_co2eKg;

      legs.forEach((leg, legIndex) => {
        const isLastLeg = legIndex === legs.length - 1;
        rows.push(
          [
            buildPlanCode(index, planKey),
            String(index + 1),
            originLabel,
            destLabel,
            weight,
            PLAN_LABELS[planKey],
            String(legIndex + 1),
            leg.mode,
            escapeCsv(leg.fromName),
            formatCoord(leg.fromLat),
            formatCoord(leg.fromLng),
            escapeCsv(leg.toName),
            formatCoord(leg.toLat),
            formatCoord(leg.toLng),
            formatDistance(leg.segment?.distanceKm),
            leg.segment?.isFallback ? "Y" : "N",
            FACTOR_BY_MODE[leg.mode],
            escapeCsv(FACTOR_SOURCE_BY_MODE[leg.mode]),
            formatCo2e(leg.segment?.co2eKg),
            isLastLeg ? formatCo2e(planTotal) : "",
            isLastLeg ? files : "",
          ].join(","),
        );
      });
    });
  });

  // Info: (20260724 - Tzuhan) BOM 讓 Excel 正確辨識 UTF-8
  return ["\uFEFF" + metaLines.join("\n"), header, ...rows].join("\n");
}
