export enum MermaidChartType {
  PIE = "pie", // Info: (20260707 - Julian) 圓餅圖
  FLOWCHART = "flowchart", // Info: (20260707 - Julian) 流程圖
  GANTT = "gantt", // Info: (20260707 - Julian) 甘特圖
  XYCHART = "xychart", // Info: (20260707 - Julian) 折線圖
  SANKEY = "sankey", // Info: (20260707 - Julian) 桑基圖
  MATRIX = "matrix", // Info: (20260717 - Julian) 矩陣圖
  TORNADO = "tornado", // Info: (20260717 - Julian) 龍捲風圖
  HISTOGRAM = "histogram", // Info: (20260717 - Julian) 直方圖
  BOX = "box", // Info: (20260717 - Julian) 箱形圖／盒鬚圖
  SEQUENCE = "sequence",
  UNKNOWN = "unknown",
}

/**
 * Info: (20260707 - Julian) Mermaid AI 編輯器統一使用的 UI 樣式常數
 */

// Info: (20260707 - Julian) Input 與 Select 樣式 (包含 Focus 與 Disabled 狀態)
export const MERMAID_INPUT_STYLE =
  "w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 placeholder:text-slate-300";

// Info: (20260707 - Julian) Label 樣式
export const MERMAID_LABEL_STYLE = "text-[10px] font-bold text-slate-500";

// Info: (20260707 - Julian) 提交按鈕樣式 (Insert Instruction)
export const MERMAID_SUBMIT_BUTTON_STYLE =
  "w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400";

// Info: (20260721 - Julian)
// input[type=range] 統一樣式：細軌 + 白色圓形滑塊 + 藍色描邊，hover 放大、disabled 灰階。
// 以 Tailwind arbitrary variants 針對 WebKit/Blink 與 Firefox 的軌道/滑塊 pseudo-element 上色，
// 維持與其他 MERMAID_* 樣式一致的「單一 className 字串」形式。
export const MERMAID_RANGE_STYLE = [
  "h-4 w-full cursor-pointer appearance-none bg-transparent focus:outline-none disabled:cursor-not-allowed",
  // WebKit / Blink 軌道
  "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-slate-200",
  // WebKit / Blink 滑塊（-mt 使 16px 滑塊對齊 6px 軌道中線）
  "[&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-600 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-transform enable:hover:[&::-webkit-slider-thumb]:scale-110",
  // Firefox 軌道
  "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:border-none [&::-moz-range-track]:bg-slate-200",
  // Firefox 滑塊
  "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-blue-600 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:transition-transform enable:hover:[&::-moz-range-thumb]:scale-110",
  // disabled 灰階（軌道與滑塊）
  "disabled:[&::-webkit-slider-runnable-track]:bg-slate-100 disabled:[&::-webkit-slider-thumb]:border-slate-300 disabled:[&::-moz-range-track]:bg-slate-100 disabled:[&::-moz-range-thumb]:border-slate-300",
].join(" ");

// Info: (20260707 - Julian) 切換按鈕 (Tabs/Segmented Control) 樣式
export const MERMAID_TOGGLE_BUTTON_STYLE = {
  container: "flex overflow-hidden rounded-md border border-slate-200",
  active: "bg-blue-600 text-white",
  inactive: "bg-slate-50 text-slate-500 hover:bg-slate-100",
  button: "px-2 py-0.5 text-[9px] font-bold transition-colors",
};
