export enum MermaidChartType {
  PIE = "pie", // Info: (20260707 - Julian) 圓餅圖
  FLOWCHART = "flowchart", // Info: (20260707 - Julian) 流程圖
  GANTT = "gantt", // Info: (20260707 - Julian) 甘特圖
  XYCHART = "xychart", // Info: (20260707 - Julian) 折線圖
  SANKEY = "sankey", // Info: (20260707 - Julian) 桑基圖
  SEQUENCE = "sequence",
  UNKNOWN = "unknown",
}

/**
 * Info: (20260707 - Julian) Mermaid AI 編輯器統一使用的 UI 樣式常數
 */

// Info: (20260707 - Julian) Input 與 Select 樣式 (包含 Focus 與 Disabled 狀態)
export const MERMAID_INPUT_STYLE =
  "w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

// Info: (20260707 - Julian) Label 樣式
export const MERMAID_LABEL_STYLE = "text-[10px] font-bold text-slate-500";

// Info: (20260707 - Julian) 提交按鈕樣式 (Insert Instruction)
export const MERMAID_SUBMIT_BUTTON_STYLE =
  "w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400";

// Info: (20260707 - Julian) 切換按鈕 (Tabs/Segmented Control) 樣式
export const MERMAID_TOGGLE_BUTTON_STYLE = {
  container: "flex overflow-hidden rounded-md border border-slate-200",
  active: "bg-blue-600 text-white",
  inactive: "bg-slate-50 text-slate-500 hover:bg-slate-100",
  button: "px-2 py-0.5 text-[9px] font-bold transition-colors",
};
