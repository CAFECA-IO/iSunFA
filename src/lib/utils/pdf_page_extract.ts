/**
 * Info: (20260814 - Emily) 把指定的幾頁抽成一份小 PDF
 * (`data/issue_drafts/open/25_image_only_sections.md`)。
 *
 * ## 為什麼是 PDF 而不是點陣圖
 *
 * 那幾頁要送給視覺模型看，而既有的 VISION 路徑本來就是把**整份 PDF** 以 base64
 * 丟進 `generateRawWithImages` —— 送 PDF 是這條管線已經在做的事，
 * 改送 PNG 反而要多一層光柵化，還要決定 DPI（太低看不清姓名職責，太高又爆體積）。
 *
 * 抽頁是**無損**的：頁面內容原樣複製，圖還是原來那張圖。
 *
 * ## 為什麼不整份送
 *
 * 那條路 2026-07-30 已經否決過：>14MB 會被 `VA_FILE_TOO_LARGE` 擋掉，
 * token 成本也高一個量級。實測 64 頁裡只有 3 頁需要看。
 */

/**
 * Info: (20260814 - Emily) 抽出指定頁（1-based），回傳新 PDF 的 bytes。
 *
 * 超出範圍的頁碼**直接忽略而不是拋錯**：頁碼來自另一支的量測結果，
 * 若兩者對不上（例如檔案在中途被換掉），少看一頁是可接受的降級，
 * 讓整個匯入失敗不是 —— 這支是補完整性的，不在必要路徑上。
 * 但呼叫端要能發現，所以回傳實際抽到的頁碼。
 */
export const extractPagesAsPdf = async (
  buffer: Buffer,
  pages: readonly number[],
): Promise<{ bytes: Uint8Array; extracted: number[] } | null> => {
  if (pages.length === 0) return null;
  const { PDFDocument } = await import("pdf-lib");

  const sourceDoc = await PDFDocument.load(new Uint8Array(buffer));
  const total = sourceDoc.getPageCount();
  // Info: (20260814 - Emily) 去重並排序:重複的頁碼會讓同一頁被送兩次
  const wanted = Array.from(new Set(pages))
    .filter((page) => Number.isInteger(page) && page >= 1 && page <= total)
    .sort((left, right) => left - right);
  if (wanted.length === 0) return null;

  const outDoc = await PDFDocument.create();
  const copied = await outDoc.copyPages(
    sourceDoc,
    wanted.map((page) => page - 1),
  );
  copied.forEach((page) => outDoc.addPage(page));

  return { bytes: await outDoc.save(), extracted: wanted };
};
