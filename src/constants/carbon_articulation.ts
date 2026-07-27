// Info: (20260720 - Tzuhan) 質量守恆勾稽護欄常數(#6520 / issue 22)
// Info: (20260720 - Tzuhan) 核心等式:期初庫存 + 本期採購 = 本期投入(消耗) + 期末庫存(± 損耗容差)
// Info: (20260720 - Tzuhan) 全部為決定性常數 — 檢核門檻不由 LLM 判斷(esg_methodology_mapping 防漂綠護欄)

import { MeasurementUnit } from "@/constants/enums";

/**
 * Info: (20260720 - Tzuhan) 方法論允許的損耗率容差(Decimal 字串,嚴禁 number 運算):
 * |等式缺口| ≤ 預期消耗 × 本值 → 視為合理損耗放行並記錄;超出 → violation 凍結。
 */
export const LOSS_RATIO_TOLERANCE = "0.05";

/**
 * Info: (20260720 - Tzuhan) 可盤點物料單位(質量/體積):燃料、原物料 — 適用守恆檢核。
 * 電力/運輸等流量型單位不可盤點,改跑合理性區間檢核(超界僅警示不凍結)。
 */
export const STOCKABLE_UNITS: readonly MeasurementUnit[] = [
  MeasurementUnit.KG,
  MeasurementUnit.GRAM,
  MeasurementUnit.TONNE,
  MeasurementUnit.LITER,
  MeasurementUnit.GALLON,
  MeasurementUnit.M3,
] as const;

/**
 * Info: (20260720 - Tzuhan) 非庫存類活動數據的合理性上限(單一企業單年,保守放寬的物理量級邊界):
 * 超出僅產生警示(資料仍是事實,可能是集團級數據),不凍結入帳。值為 Decimal 字串。
 */
export const PLAUSIBILITY_MAX_BY_UNIT: Partial<Record<MeasurementUnit, string>> =
  {
    // Info: (20260720 - Tzuhan) 100 億度電/年 ≈ 台灣全國用電的 3.5%,單一企業超出即極可疑
    [MeasurementUnit.KWH]: "10000000000",
    [MeasurementUnit.MWH]: "10000000",
    [MeasurementUnit.GJ]: "40000000",
    // Info: (20260720 - Tzuhan) 運輸活動(公里/延噸公里/人公里)
    [MeasurementUnit.KM]: "1000000000",
    [MeasurementUnit.TKM]: "100000000000",
    [MeasurementUnit.PKM]: "100000000000",
  };

// Info: (20260720 - Tzuhan) 單次檢核的庫存紀錄筆數上限(輸入護欄,對齊 CARBON_CALCULATE_MAX_ACTIVITIES 量級)
export const CARBON_ARTICULATION_MAX_STOCK_RECORDS = 50;

// Info: (20260720 - Tzuhan) 勾稽結果狀態(決定性列舉;REVIEW 步驟出口與 #23 報告數據段落凍結依此裁決)
export enum ArticulationStatusEnum {
  // Info: (20260720 - Tzuhan) 有庫存紀錄且全數通過(含容差內損耗)
  PASSED = "PASSED",
  // Info: (20260720 - Tzuhan) 至少一筆守恆違反 → 報告數據段落凍結、費思追問澄清
  VIOLATED = "VIOLATED",
  // Info: (20260720 - Tzuhan) 無可盤點庫存紀錄(純電力/運輸盤查屬合法情境),守恆檢核不適用
  NOT_APPLICABLE = "NOT_APPLICABLE",
}

// Info: (20260720 - Tzuhan) 守恆違反原因(決定性列舉,UI 對應文案)
export enum ArticulationViolationReasonEnum {
  // Info: (20260720 - Tzuhan) |期初+採購-期末-消耗| 超出損耗容差
  MASS_GAP_EXCEEDS_TOLERANCE = "MASS_GAP_EXCEEDS_TOLERANCE",
  // Info: (20260720 - Tzuhan) 期末 > 期初+採購:物理不可能(庫存無中生有)
  NEGATIVE_EXPECTED_CONSUMPTION = "NEGATIVE_EXPECTED_CONSUMPTION",
  // Info: (20260720 - Tzuhan) 庫存與消耗紀錄單位跨量綱,無法對齊驗證
  UNIT_MISMATCH = "UNIT_MISMATCH",
  // Info: (20260720 - Tzuhan) 庫存紀錄數值無法決定性解析
  UNPARSABLE_QUANTITY = "UNPARSABLE_QUANTITY",
}

// Info: (20260720 - Tzuhan) 合理性警示原因(僅警示不凍結)
export enum ArticulationWarningReasonEnum {
  QUANTITY_EXCEEDS_PLAUSIBLE_MAX = "QUANTITY_EXCEEDS_PLAUSIBLE_MAX",
}
