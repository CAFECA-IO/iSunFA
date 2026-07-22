import { FC, Dispatch, SetStateAction } from "react";

/**
 * Info: (20260721 - Julian)
 * AI 圖表編輯器（通用）介面。
 * 通用 modal（AiChartEditorModal）只擁有狀態機與外殼，所有圖表別的差異
 * （動作套用、預覽渲染、產生流程、標題、文案）全部由 adapter 提供。
 * 詳見 documents/architecture/ai_chart_editor_merge_plan.md。
 */

/**
 * Info: (20260721 - Julian) 所有結構化編輯動作的最小共通形狀。
 * mermaid 的 IChartAction 與 custom 的 IMatrixAction 皆相容。
 */
export interface IChartEditorAction {
  id: string;
  type: string;
  description: string;
}

/**
 * Info: (20260721 - Julian) 左欄（工具 + AI 指令）渲染所需的即時情境。
 */
export interface IChartEditorControlContext<
  TAction extends IChartEditorAction,
> {
  chart: string; // Info: (20260721 - Julian) 目前編輯基底（internalBaseChart）
  aiInstruction: string;
  setAiInstruction: Dispatch<SetStateAction<string>>;
  pendingActions: TAction[];
  onAddAction: (action: TAction) => void;
  onRemoveAction: (id: string) => void;
  chartTitle: string;
  onTitleChange: (title: string) => void;
}

/**
 * Info: (20260721 - Julian) 右欄（變更前後預覽）渲染所需的即時情境。
 */
export interface IChartEditorPreviewContext {
  baseChart: string; // Info: (20260721 - Julian) 目前編輯基底（供「修改前」預覽）
  aiInstruction: string;
  isGenerating: boolean;
  newChartPreview: string; // Info: (20260721 - Julian) 套用動作後的圖表（供「修改後」預覽）
  apiError: string | null;
  onCancel: () => void;
  onGenerate: () => void;
  onAbort: () => void;
  onAdopt: () => void;
}

/**
 * Info: (20260721 - Julian) 關閉時「有未儲存變更」警示視窗的文案（已翻譯字串，i18n 策略採方案 A）。
 */
export interface IChartEditorCloseWarning {
  title: string;
  message: string;
  cancelText: string;
  confirmText: string;
}

/**
 * Info: (20260721 - Julian) 圖表編輯器 adapter：封裝某一類圖表（mermaid / custom）的所有差異。
 */
export interface IChartEditorAdapter<TAction extends IChartEditorAction> {
  // Info: (20260721 - Julian) 標記為 mock（如自訂圖表尚未接後端）；供工具列徽章 / feature flag 判斷
  isMock?: boolean;

  // Info: (20260721 - Julian) 決定論套用單一動作，回傳新圖表字串（不變更輸入）
  applyAction: (chart: string, action: TAction) => string;

  // Info: (20260721 - Julian) 計算目前標題：優先取 pendingActions 中的標題動作，否則由 chart 解析
  getTitle: (chart: string, pendingActions: TAction[]) => string;

  // Info: (20260721 - Julian) 由新標題建立標題動作；未提供則代表此圖表不支援標題編輯
  buildTitleAction?: (title: string) => TAction;

  // Info: (20260721 - Julian) 產生流程：回傳新圖表字串；失敗請 throw（訊息會顯示於預覽區）
  generate: (
    baseChart: string,
    instruction: string,
    signal: AbortSignal,
  ) => Promise<string>;

  // Info: (20260721 - Julian) 左欄 / 右欄元件（以 JSX element 渲染，非在 render 期間呼叫函式，
  // 避免傳入讀取 ref 的 handler 觸發 react-hooks/refs 誤判）。可包既有的 mermaid / custom panel。
  ControlPanel: FC<IChartEditorControlContext<TAction>>;
  PreviewPanel: FC<IChartEditorPreviewContext>;

  // Info: (20260721 - Julian) 關閉警示文案
  closeWarning: IChartEditorCloseWarning;
}
