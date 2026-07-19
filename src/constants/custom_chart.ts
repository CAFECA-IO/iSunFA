/**
 * Info: (20260717 - Julian)
 * 自訂圖表（custom chart）相關常數。
 * 這些自訂圖表以 Markdown fenced code block 的語言標籤攔截，
 * enum 值即等於 fence 語言（例如 ```custom-matrix），避免另做字串對照。
 */
export enum CustomChartType {
  MATRIX = "custom-matrix",
  TORNADO = "custom-tornado",
  HISTOGRAM = "custom-histogram",
  BOX = "custom-box",
}

/**
 * Info: (20260717 - Julian) 自訂圖表 DSL 的設定列 key，避免魔法字串
 */
export enum CustomChartConfigKey {
  TITLE = "title",
  X_AXIS = "xaxis",
  Y_AXIS = "yaxis",
  X_SCALE = "xscale",
  Y_SCALE = "yscale",
  BASELINE = "baseline",
  UNIT = "unit",
}

/**
 * Info: (20260717 - Julian) 解析失敗的錯誤碼（供 render fallback 與除錯使用）
 */
export enum CustomChartParseErrorCode {
  UNKNOWN_TYPE = "UNKNOWN_TYPE",
  EMPTY_CONTENT = "EMPTY_CONTENT",
  NO_DATA_ROWS = "NO_DATA_ROWS",
  MALFORMED_ROW = "MALFORMED_ROW",
  INVALID_NUMBER = "INVALID_NUMBER",
  SCHEMA_VALIDATION_FAILED = "SCHEMA_VALIDATION_FAILED",
}

// Info: (20260717 - Julian) DSL 註解前綴（沿用 mermaid 慣例）
export const CUSTOM_CHART_COMMENT_PREFIX = "%%";

// Info: (20260717 - Julian) 雙極軸分隔符（左為 min 端、右為 max 端）；VS16 變體於 parser 內先行移除
export const CUSTOM_CHART_AXIS_SEPARATORS: readonly string[] = ["↔", "<->"];
