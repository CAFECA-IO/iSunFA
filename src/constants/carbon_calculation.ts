// Info: (20260716 - Emily) CO2e 計算 facade 常數(#6519)

import { MeasurementUnit } from "@/constants/enums";

/**
 * Info: (20260716 - Emily) 係數庫單位字串 → MeasurementUnit 決定性正規化。
 * 係數字典(true_esg_coefficients)單位為自由字串(「度(kwh)」「公升(L)」「公噸(mt)」…),
 * UnitConverter 只認 MeasurementUnit;對不上映射者一律進待補清單(寧可懸記絕不瞎猜,ADR 007)。
 * key 為小寫化後的完整字串或括號內代碼。
 */
export const COEFFICIENT_UNIT_ALIASES: Record<string, MeasurementUnit> = {
  // Info: (20260716 - Emily) 能量
  kwh: MeasurementUnit.KWH,
  "度(kwh)": MeasurementUnit.KWH,
  mwh: MeasurementUnit.MWH,
  gj: MeasurementUnit.GJ,
  // Info: (20260716 - Emily) 質量
  kg: MeasurementUnit.KG,
  "公斤(kg)": MeasurementUnit.KG,
  g: MeasurementUnit.GRAM,
  tonne: MeasurementUnit.TONNE,
  mt: MeasurementUnit.TONNE,
  "公噸(mt)": MeasurementUnit.TONNE,
  // Info: (20260716 - Emily) 體積
  l: MeasurementUnit.LITER,
  liter: MeasurementUnit.LITER,
  litre: MeasurementUnit.LITER,
  "公升(l)": MeasurementUnit.LITER,
  gallon: MeasurementUnit.GALLON,
  m3: MeasurementUnit.M3,
  "立方公尺(m3)": MeasurementUnit.M3,
  // Info: (20260716 - Emily) 運輸
  km: MeasurementUnit.KM,
  tkm: MeasurementUnit.TKM,
  "延噸公里(tkm)": MeasurementUnit.TKM,
  pkm: MeasurementUnit.PKM,
};

// Info: (20260716 - Emily) 單次計算的活動筆數上限(輸入護欄)
export const CARBON_CALCULATE_MAX_ACTIVITIES = 200;

// Info: (20260716 - Emily) 待補原因(決定性列舉,UI 對應文案)
export enum CarbonPendingReasonEnum {
  UNPARSABLE_QUANTITY = "UNPARSABLE_QUANTITY",
  NO_FACTOR_MATCH = "NO_FACTOR_MATCH",
  UNIT_MISMATCH = "UNIT_MISMATCH",
}
