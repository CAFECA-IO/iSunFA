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
 * Info: (20260721 - Julian)
 * 各自訂圖表類型的下載預設檔名（未提供圖表標題時的 fallback）。
 */
export enum CustomChartExportName {
  MATRIX = "matrix-chart",
  TORNADO = "tornado-chart",
  HISTOGRAM = "histogram-chart",
  BOXPLOT = "boxplot-chart",
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
  LEFT_COLOR = "leftcolor", // Info: (20260723 - Julian) 龍捲風圖左數列顏色 HEX
  RIGHT_COLOR = "rightcolor", // Info: (20260723 - Julian) 龍捲風圖右數列顏色 HEX
  MODE = "mode", // Info: (20260723 - Julian) 龍捲風圖型別（compare 比較型 / sensitivity 敏感度型）
  BASELINE = "baseline", // Info: (20260723 - Julian) 龍捲風圖敏感度型的中心基準值
  TREND_COLOR = "trendcolor", // Info: (20260730 - Julian) 直方圖趨勢線顏色 HEX（未設定採預設色）
}

/**
 * Info: (20260723 - Julian)
 * 龍捲風圖型別：
 * - COMPARE：比較型（蝴蝶圖），中心為左右兩數列分隔線，兩側各自從 0 起算。
 * - SENSITIVITY：敏感度型，中心為 baseline，兩數值解讀為相對基準的負向／正向偏移（±）。
 * 兩型共用同一雙側外觀，僅語意與中心標籤不同。未設定時預設 COMPARE。
 */
export enum TornadoMode {
  COMPARE = "compare",
  SENSITIVITY = "sensitivity",
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
 * Info: (20260730 - Julian) 直方圖趨勢線的預設線色（未指定 trendColor 時採用）；與深色長條（#152C5B）對比明顯。
 */
export const DEFAULT_HISTOGRAM_TREND_COLOR = "#FF9800";

/**
 * Info: (20260730 - Julian)
 * 各趨勢線類型的呈現中繼資料（顯示標籤 + 預設線色）。
 * 供工具面板「取得趨勢線原始資料」：即使 DSL 未寫 trendColor，也能由此得知該類型的預設色與名稱。
 */
export interface IHistogramTrendMeta {
  label: string; // Info: (20260730 - Julian) 顯示名稱的 i18n key（字面值收斂於 locale 檔，供 t() 查表）
  defaultColor: string; // Info: (20260730 - Julian) 預設線色 HEX
}

export const HISTOGRAM_TREND_META: Readonly<
  Record<HistogramTrendType, IHistogramTrendMeta>
> = {
  [HistogramTrendType.NORMAL]: {
    label: "chart.custom_chart.histogram.trend_normal",
    defaultColor: DEFAULT_HISTOGRAM_TREND_COLOR,
  },
};

/**
 * Info: (20260730 - Julian)
 * 趨勢線選色盤：挑選高彩度、彼此易辨、且與深色長條對比清楚的線條色，供 ColorPicker 快速選色。
 */
export const HISTOGRAM_TREND_COLOR_OPTIONS: string[] = [
  "#FF9800", // 橘（預設）
  "#E11D48", // 玫紅
  "#7C3AED", // 紫
  "#0EA5E9", // 天藍
  "#16A34A", // 綠
  "#0F172A", // 墨黑
];

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
 * Info: (20260722 - Julian)
 * 龍捲風圖結構化編輯的動作類型列舉（供 tornado_tools_submenu 的五項工具使用）。
 * 對應到 custom-tornado DSL 的設定列（baseline/unit/顏色）、資料列（item）與數列標頭（group）操作，
 * 所有編輯皆為決定論字串操作，不呼叫 LLM、不做數值計算。
 */
export enum TornadoActionType {
  EDIT_SETTINGS = "TORNADO_EDIT_SETTINGS",
  ADD_ITEM = "TORNADO_ADD_ITEM",
  EDIT_ITEM = "TORNADO_EDIT_ITEM",
  EDIT_GROUP = "TORNADO_EDIT_GROUP",
  DELETE_ITEM = "TORNADO_DELETE_ITEM",
}

/**
 * Info: (20260723 - Julian)
 * 自訂圖表「跨類型共用」的結構化編輯動作。目前僅標題（title 設定列各類型皆有），
 * 由 applyCustomChartAction 於分派前統一處理，與 mermaid 的 CHANGE_TITLE 對應。
 */
export enum CustomChartActionType {
  SET_TITLE = "CUSTOM_SET_TITLE",
}

/**
 * Info: (20260730 - Julian)
 * 直方圖結構化編輯的動作類型列舉（對應 histogram_tools_submenu 的五項工具）。
 * 對應 custom-histogram DSL 的資料列（分箱 item：新增／編輯／刪除）、設定列（軸標題）與趨勢線開關／顏色；
 * 所有編輯皆為決定論字串操作，不呼叫 LLM、不做數值計算。
 */
export enum HistogramActionType {
  ADD_ITEM = "HISTOGRAM_ADD_ITEM",
  EDIT_ITEM = "HISTOGRAM_EDIT_ITEM",
  EDIT_AXIS = "HISTOGRAM_EDIT_AXIS",
  SWITCH_TREND_LINE = "HISTOGRAM_SWITCH_TREND_LINE",
  DELETE_ITEM = "HISTOGRAM_DELETE_ITEM",
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

/**
 * Info: (20260731 - Julian)
 * 配對分隔符（左端 <-> 右端），VS16 變體於 parser 內先行移除。兩處語意相同，皆表「一對事物的兩端」：
 * - 矩陣圖雙極軸設定值：min 端 <-> max 端
 * - 龍捲風圖標題列：左數列 <-> 右數列
 *
 * 標準形式為 ASCII 的 `<->`（editor 一律輸出此形式），解析時兩者皆接受。
 */
export const CUSTOM_CHART_PAIR_SEPARATORS: readonly string[] = ["↔", "<->"];

/**
 * Info: (20260722 - Julian)
 * 背景色
 * 以低彩度、高明度的淺色為主，適合作為背景不干擾前景資料點與文字。
 */
export const BACKGROUND_COLOR_OPTIONS = [
  "#FDECEC", // 淺紅
  "#FEF3E0", // 淺橘
  "#FEF9E7", // 淺黃
  "#EAF6EC", // 淺綠
  "#E6F4F1", // 淺青
  "#E8F0FE", // 淺藍
  "#F0EBFA", // 淺紫
  "#F4F4F5", // 淺灰
  "#FFFFFF", // 白
];

// Info: (20260720 - Julian) 無群組時的中性點色
export const NEUTRAL_POINT = "#64748B";

// Info: (20260721 - Julian) 四象限預設底色
export const DEFAULT_QUADRANT_COLORS = [
  "#FEF9E7",
  "#FEF9E7",
  "#FEF9E7",
  "#FEF9E7",
];
