// Info: (20260724 - Tzuhan) 運輸方式適用性判斷引擎(純函數,前後端共用的單一決定論規則)
// Info: (20260724 - Tzuhan) 規則:1) 陸運真實可達且距離不長於聯運總距離 → 該聯運不適用(繞港/繞機場是純浪費)
// Info: (20260724 - Tzuhan)      2) 海運/空運主段距離低於商業運輸門檻(同港/同機場退化)→ 不適用
// Info: (20260724 - Tzuhan) 後端於計算時寫入 isApplicable 旗標;歷史資料無旗標時,前端以本函數重新推導,新舊資料行為一致

import type { Geometry } from "geojson";
import { ILogisticsPlan } from "@/interfaces/logistics";
import {
  MIN_AIR_LEG_DISTANCE_KM,
  MIN_SEA_LEG_DISTANCE_KM,
} from "@/constants/logistics";

export interface IRouteApplicability {
  land: boolean;
  sea: boolean;
  air: boolean;
  custom: boolean;
}

export const NO_ROUTE_APPLICABILITY: IRouteApplicability = {
  land: false,
  sea: false,
  air: false,
  custom: false,
};

/**
 * Info: (20260724 - Tzuhan) 起訖點直線 fallback 的 geometry 只有 2 個座標點,代表無真實陸地路徑
 * (沿用原 page.tsx isLandAvailable 的判斷,收斂到此處供三個呼叫端共用)
 */
const isDegenerateLandGeometry = (
  geometry: Geometry | null | undefined,
): boolean => {
  if (!geometry) return false;
  return geometry.type === "LineString" && geometry.coordinates.length <= 2;
};

export function getRouteApplicability(
  plan?: ILogisticsPlan | null,
): IRouteApplicability {
  const plans = plan?.comparisonData?.plans;
  if (!plans) return NO_ROUTE_APPLICABILITY;

  const landPlan = plans.landOnly;
  const seaPlan = plans.sea_multimodal;
  const airPlan = plans.air_multimodal;

  const land =
    !!landPlan?.success &&
    !landPlan.isFallback &&
    !isDegenerateLandGeometry(landPlan.geometry);
  const landDistanceKm = land ? landPlan.distanceKm || 0 : 0;
  const hasRealLandRoute = land && landDistanceKm > 0;

  let sea: boolean;
  if (typeof seaPlan?.isApplicable === "boolean") {
    // Info: (20260724 - Tzuhan) 後端旗標為單一真實來源,優先採用
    sea = seaPlan.isApplicable;
  } else {
    const seaLegKm = seaPlan?.sea_port_to_port?.distanceKm || 0;
    const seaTotalKm =
      seaLegKm +
      (seaPlan?.land_origin_to_port?.distanceKm || 0) +
      (seaPlan?.land_port_to_dest?.distanceKm || 0);
    sea =
      !!seaPlan?.sea_port_to_port?.success &&
      seaLegKm >= MIN_SEA_LEG_DISTANCE_KM &&
      !(hasRealLandRoute && landDistanceKm <= seaTotalKm);
  }

  let air: boolean;
  if (typeof airPlan?.isApplicable === "boolean") {
    air = airPlan.isApplicable;
  } else {
    const airLegKm = airPlan?.air_airport_to_airport?.distanceKm || 0;
    const airTotalKm =
      airLegKm +
      (airPlan?.land_origin_to_airport?.distanceKm || 0) +
      (airPlan?.land_airport_to_dest?.distanceKm || 0);
    air =
      !!airPlan?.air_airport_to_airport?.success &&
      airLegKm >= MIN_AIR_LEG_DISTANCE_KM &&
      !(hasRealLandRoute && landDistanceKm <= airTotalKm);
  }

  return {
    land,
    sea,
    air,
    custom: !!plans.custom_multimodal,
  };
}
