/**
 * Info: (20260721 - Julian)
 * 圖表 UI 共用常數（AI 圖表編輯器等）。
 * 集中散落於各元件的 UI 列舉，避免魔法字串與重複定義。
 */

/**
 * Info: (20260721 - Julian) AI 圖表編輯器「變更前後預覽」的排版方向。
 * 供 mermaid 與自訂圖表的編輯器預覽面板共用。
 */
export enum PreviewDirective {
  ROW = "ROW",
  COLUMN = "COLUMN",
}
