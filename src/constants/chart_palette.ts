// Info: (20260802 - Luphia) 圖表用色的 CSS 變數名稱與角色。
// Info: (20260802 - Luphia) 值定義在 src/app/globals.css 的四個主題區塊；
// Info: (20260802 - Luphia) 此處只放名稱與型別，避免同一組顏色在 CSS 與 TS 各有一份而漂移。

export const CHART_COLOR_VARIABLES = {
  /** Info: (20260802 - Luphia) 座標區的水平／垂直格線 */
  grid: "--t-chart-grid",
  /** Info: (20260802 - Luphia) 座標軸線、離群點、箭頭標記 */
  axis: "--t-chart-axis",
  /** Info: (20260802 - Luphia) 刻度與軸標籤文字 */
  label: "--t-chart-label",
  /** Info: (20260802 - Luphia) hover 時顯示的數值文字 */
  value: "--t-chart-value",
  /** Info: (20260802 - Luphia) 疊在數列色上的中位線與區塊分隔線 */
  separator: "--t-chart-separator",
  /** Info: (20260802 - Luphia) 主要數列（盒鬚、長條、龍捲風左側） */
  series1: "--t-chart-series-1",
  /** Info: (20260802 - Luphia) 次要數列（龍捲風右側、Mermaid 連線） */
  series2: "--t-chart-series-2",
  /** Info: (20260802 - Luphia) 匯出 PNG 時的底色 */
  surface: "--t-chart-surface",
  /** Info: (20260802 - Luphia) Mermaid 流程圖的節點底色 */
  nodeSurface: "--t-chart-node-surface",
  /** Info: (20260802 - Luphia) Mermaid 次要節點／群集底色 */
  nodeSurfaceAlt: "--t-chart-node-surface-alt",
  /** Info: (20260802 - Luphia) Mermaid 節點文字與標題 */
  nodeText: "--t-chart-node-text",
  /** Info: (20260802 - Luphia) Mermaid 連線標籤的底色 */
  edgeLabel: "--t-chart-edge-label",
  /** Info: (20260802 - Luphia) 十色類別色板的第一色（其餘九色兩種主題共用） */
  categorical1: "--t-chart-categorical-1",
} as const;

export type ChartColorRole = keyof typeof CHART_COLOR_VARIABLES;
export type IChartPalette = Record<ChartColorRole, string>;

/**
 * Info: (20260802 - Luphia) 伺服器渲染與尚未掛載時使用的值。
 *
 * 必須與 globals.css 的**淺色**區塊一致：伺服器讀不到 CSS 變數，
 * 若這裡給深色值，深色使用者反而會在第一幀看到正確色、掛載後跳一下；
 * 給淺色值則與伺服器輸出一致，不會有 hydration 落差。
 */
export const CHART_PALETTE_FALLBACK: IChartPalette = {
  grid: "#e2e8f0",
  axis: "#94a3b8",
  label: "#64748b",
  value: "#334155",
  separator: "#ffffff",
  series1: "#152c5b",
  series2: "#ff9800",
  surface: "#f8fafc",
  nodeSurface: "#ffffff",
  nodeSurfaceAlt: "#f8fafc",
  nodeText: "#152c5b",
  edgeLabel: "#fff3e0",
  categorical1: "#4f46e5",
};

// Info: (20260810 - Julian) 圖表十色類別色板。
export const CHART_CATEGORICAL_REST: readonly string[] = [
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
  "#06B6D4",
  "#EF4444",
  "#84CC16",
  "#F97316",
  "#3B82F6",
];

/** Info: (20260810 - Julian) 完整十色：第一色需由 `useChartPalette` 讀出後傳入 */
export function buildCategoricalColors(categorical1: string): string[] {
  return [categorical1, ...CHART_CATEGORICAL_REST];
}
