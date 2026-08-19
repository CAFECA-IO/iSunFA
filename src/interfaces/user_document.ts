/**
 * Info: (20260817 - Luphia) 「文件與記憶」頁的文件 DTO。
 *
 * 三種來源合成同一份清單，但**不抹平差異**：`kind` 決定畫面上的圖示與說明，
 * `encrypted` 決定要不要告訴使用者「這份系統自己也讀不到」。
 */

export const USER_DOCUMENT_KIND = {
  // Info: (20260817 - Luphia) 使用者自己建立的 Markdown 文件（含分享連結）
  PDF_EDITOR: "PDF_EDITOR",
  // Info: (20260817 - Luphia) 上傳並掛在傳票／分錄上的憑證檔案
  EVIDENCE_FILE: "EVIDENCE_FILE",
  // Info: (20260817 - Luphia) 碳盤查報告草稿（個人模式為端對端加密）
  CARBON_DRAFT: "CARBON_DRAFT",
} as const;

export type UserDocumentKind =
  (typeof USER_DOCUMENT_KIND)[keyof typeof USER_DOCUMENT_KIND];

export interface IUserDocument {
  id: string;
  kind: UserDocumentKind;
  title: string;
  // Info: (20260817 - Luphia) epoch 秒，與本專案其他 DTO 的時間單位一致
  updatedAt: number;
  /**
   * Info: (20260817 - Luphia) 內容是否為端對端加密（server 讀不到）。
   * 要誠實地傳到畫面上——否則使用者會以為系統看得到而我們選擇不顯示。
   */
  encrypted: boolean;
  // Info: (20260817 - Luphia) 憑證與帳本模式草稿才有；個人模式的草稿沒有歸屬帳本
  accountBookId?: string;
  // Info: (20260817 - Luphia) PDF 編輯器文件專屬：分享連結目前是否開著
  shared?: boolean;
}
