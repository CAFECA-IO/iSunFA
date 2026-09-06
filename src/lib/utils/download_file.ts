import { IDownloadedFile } from "@/lib/utils/request";

/**
 * Info: (20260904 - Julian) 把 `requestFile()` 取回的檔案交給瀏覽器下載。
 *
 * ## 為什麼抽出來
 *
 * 這八行在專案裡已經各自寫過三次（`pdf.ts`、`carbon_report_pdf_client.ts`、
 * `presence_page_body.tsx`）。它沒有任何業務判斷，但**有一個容易漏的細節**：
 * `revokeObjectURL`。漏掉的話那份 blob 會留在記憶體裡直到整頁重載 ——
 * 而匯出的內容是薪資明細，留在記憶體裡的東西多活一段時間就是多一段風險。
 *
 * ToDo: (20260904 - Julian) 既有那三處仍是各自 inline 的。它們的行為與這裡相同，
 * 但改動它們會動到 HR 與碳盤查兩個無關模組，留給那些模組下次經過時採用。
 */
export const saveDownloadedFile = (
  file: IDownloadedFile,
  fallbackFilename: string,
): void => {
  const url = window.URL.createObjectURL(file.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  /**
   * Info: (20260904 - Julian) 檔名以伺服器為準：它帶著產出時刻，
   * 與伺服端的 log 對得起來。前端自己組的話，兩邊會各說一個時間。
   */
  anchor.download = file.filename ?? fallbackFilename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
};
