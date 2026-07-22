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
  BOXPLOT = "custom-boxplot",
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
  UNIT = "unit",
  TREND = "trend",
  QUADRANT_COLORS = "quadrantcolors", // Info: (20260721 - Julian) 矩陣圖四象限底色（Q1..Q4，逗號分隔 HEX）
}

/**
 * Info: (20260720 - Julian)
 * 直方圖可疊加的趨勢線類型（選填）。目前僅支援常態分佈曲線。
 * 曲線由渲染層依實際 count 決定論計算（加權平均/標準差），非 LLM 產生、非捏造資料。
 */
export enum HistogramTrendType {
  NORMAL = "normal",
}

/**
 * Info: (20260721 - Julian)
 * 矩陣圖結構化編輯的動作類型列舉（供 matrix_tools_submenu 的四項工具使用）。
 * 對應到 custom-matrix DSL 的資料列（item）與雙極軸（axis）操作，
 * 所有編輯皆為決定論字串操作，不呼叫 LLM、不做數值計算。
 */
export enum MatrixActionType {
  ADD_ITEM = "MATRIX_ADD_ITEM",
  EDIT_ITEM = "MATRIX_EDIT_ITEM",
  EDIT_AXIS = "MATRIX_EDIT_AXIS",
  EDIT_GROUP = "MATRIX_EDIT_GROUP",
  CHANGE_QUADRANT_COLOR = "MATRIX_CHANGE_QUADRANT_COLOR",
  DELETE_ITEM = "MATRIX_DELETE_ITEM",
}

/**
 * Info: (20260721 - Julian)
 * 群組顏色的 HEX 格式驗證（#RGB / #RRGGBB / #RRGGBBAA）。
 * 顏色存於矩陣資料列的第 5 欄，parser 以此驗證，非法值 fail fast。
 */
export const HEX_COLOR_REGEX =
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

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
