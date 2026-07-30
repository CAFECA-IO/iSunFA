import { FC, ReactNode } from "react";

/**
 * Info: (20260730 - Julian)
 * AI 圖表編輯器（通用）介面。
 * 通用 modal（AiChartEditorModal）擁有整個版面與狀態機（header、分頁、共用「圖表標題」欄位、
 * AI 指令區、暫存動作清單、前後預覽外殼與所有按鈕）。各圖表家族只需提供兩個差異點：
 * - Tools：左半邊「常用工具」內容
 * - renderPreview：右半邊圖表渲染（mermaid SVG／自訂 Canvas 渲染模式不同）
 * 其餘為決定論邏輯與少量文案資料。
 */

/**
 * Info: (20260721 - Julian) 所有結構化編輯動作的最小共通形狀。
 */
export interface IChartEditorAction {
  id: string;
  type: string;
  description: string;
}

/**
 * Info: (20260723 - Julian) 左半邊「常用工具」元件所需情境（由 modal 注入）。
 */
export interface IChartEditorToolsContext<TAction extends IChartEditorAction> {
  chart: string; // Info: (20260723 - Julian) 目前編輯基底
  pendingActions: TAction[];
  onAddAction: (action: TAction) => void;
  onRemoveAction: (id: string) => void;
}

/**
 * Info: (20260723 - Julian)
 * 圖表編輯器 adapter：只封裝某一圖表家族（mermaid / custom）的差異，其餘全交給通用 modal。
 */
export interface IChartEditorAdapter<TAction extends IChartEditorAction> {
  // Info: (20260723 - Julian) 是否有常用工具（無則工具分頁顯示佔位）
  hasTools: boolean;

  // Info: (20260723 - Julian) AI 指令範例
  examples: string[];

  // Info: (20260723 - Julian) 決定論套用「一整批」暫存動作，回傳新圖表字串（不變更輸入）。
  // 採批次以支援 tombstone 穩定索引（避免「先刪後編」打錯資料列）。
  applyActions: (chart: string, actions: readonly TAction[]) => string;

  // Info: (20260721 - Julian) 產生流程：回傳新圖表字串；失敗請 throw（訊息顯示於預覽區）
  generate: (
    baseChart: string,
    instruction: string,
    signal: AbortSignal,
  ) => Promise<string>;

  // Info: (20260721 - Julian) 計算目前標題：優先取 pendingActions 中的標題動作，否則由 chart 解析
  getTitle: (chart: string, pendingActions: TAction[]) => string;

  // Info: (20260721 - Julian) 由新標題建立標題動作；未提供則不顯示標題欄位
  buildTitleAction?: (title: string) => TAction;

  // Info: (20260723 - Julian) 右半邊：把圖表字串渲染為預覽節點（自帶渲染失敗處理）
  renderPreview: (chart: string) => ReactNode;

  // Info: (20260723 - Julian) 左半邊：常用工具內容
  Tools: FC<IChartEditorToolsContext<TAction>>;

  // Info: (20260723 - Julian) 圖表字串是否可安全採用（避免採用壞圖）；未提供則一律可採用
  isRenderable?: (chart: string) => boolean;
}
