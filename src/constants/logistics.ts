// Info: (20260724 - Tzuhan) 運輸物流單一來源常數:排放係數與運輸方式適用性門檻
// Info: (20260724 - Tzuhan) 嚴禁在 service/component 內硬編碼下列數值(曾出現 0.01614/0.50422 錯誤係數殘留)

/**
 * Info: (20260724 - Tzuhan) 排放係數 (kg CO₂e / t-km)
 * 以字串保存,計算時一律經 MoneyUtil.toDecimal 轉 Decimal,禁止原生浮點運算
 */
export const EMISSION_FACTORS = {
  LAND: "0.11289",
  SEA: "0.01045",
  AIR: "0.6023",
} as const;

export type EmissionFactorMode = keyof typeof EMISSION_FACTORS;

export const EMISSION_FACTOR_UNIT = "kg CO₂e / t-km";

export const EMISSION_FACTOR_SOURCES = {
  LAND: "UK DEFRA 2025 (HGV)",
  SEA: "UK DEFRA 2025 (Container ship)",
  AIR: "UK DEFRA 2025 (Long-haul)",
} as const;

/**
 * Info: (20260724 - Tzuhan) 運輸方式適用性門檻(決定論規則,禁止交由 LLM 判斷)
 * MIN_SEA_LEG_DISTANCE_KM:港到港距離低於此值視為同港/鄰港退化案例,海運不適用
 * MIN_AIR_LEG_DISTANCE_KM:機場到機場距離低於此值無商業空運航班意義,空運不適用
 */
export const MIN_SEA_LEG_DISTANCE_KM = 10;
export const MIN_AIR_LEG_DISTANCE_KM = 100;

/**
 * Info: (20260724 - Tzuhan) 匯出方案類型 → PDF 檔名後綴(需求二:一份 PDF 一個方案,檔名可辨識)
 * key 對齊 RouteType("land" | "sea" | "air" | "custom")
 */
export const EXPORT_PLAN_FILE_SUFFIX = {
  land: "land_only",
  sea: "sea_multimodal",
  air: "air_multimodal",
  custom: "custom_multimodal",
} as const;

export type ExportPlanRouteType = keyof typeof EXPORT_PLAN_FILE_SUFFIX;

/**
 * Info: (20260724 - Tzuhan) 運輸計算器頁面的 URL query param 名稱(需求四:歷史導覽以 URL 為狀態來源)
 */
export const TRANSPORT_CALCULATOR_QUERY_PARAM = {
  TAB: "tab",
  ANALYSIS_ID: "analysisId",
} as const;

/**
 * Info: (20260724 - Tzuhan) 歷史清單瀏覽狀態(捲動位置/展開列)的 sessionStorage key
 * 僅存 UI 狀態,不存業務資料;分頁關閉即清空
 */
export const HISTORY_VIEW_STATE_STORAGE_KEY =
  "transport_calculator_history_view_state";
