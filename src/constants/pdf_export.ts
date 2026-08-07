/**
 * Info: (20260807 - Emily) 前端 PDF 光柵化的尺寸預算與分段參數
 * (issue_drafts/inventory_table_import/10_report_pdf_all_blank.md)。
 *
 * 背景:`html2pdf.js` 會把**整份文件一次**光柵化成單一 canvas 再切頁。
 * 溫盤報告匯入整份盤查報告書之後輸出 153 頁,
 * 153 × 1123px(96dpi A4)× scale 2 ≈ 343,000 px —— 遠超瀏覽器的單張 canvas 上限。
 * 超限時 `getContext('2d')` **不會拋錯**,而是給一張尺寸正確、內容全空的 canvas,
 * 於是「頁數正確、每頁空白」——「輸出成功」與「輸出正確」在畫面上完全同形。
 */

/**
 * Info: (20260807 - Emily) 單一 canvas 的單邊上限(px)。
 * Chrome/Firefox 為 65,535;Safari 更低,故實際判定另有面積上限把關。
 */
export const PDF_CANVAS_MAX_DIMENSION_PX = 65535;

/**
 * Info: (20260807 - Emily) 單一 canvas 的總面積上限(px²),取各家瀏覽器中較保守者。
 * Chrome 約 2.68 億(16384²),Safari(iOS)更低。
 */
export const PDF_CANVAS_MAX_AREA_PX = 268435456;

/**
 * Info: (20260807 - Emily) 實際可用的比例 —— 不貼著上限走。
 * 上限是「開始失敗」的位置而不是「還能安全運作」的位置,
 * 而失敗的形式是靜默空白,沒有第二次機會。
 */
export const PDF_CANVAS_SAFE_RATIO = 0.8;

// Info: (20260426 - Luphia) 既有的光柵化倍率(維持不變,短文件輸出品質不得因本次修正而下降)
export const PDF_EXPORT_SCALE = 2;

/**
 * Info: (20260807 - Emily) 分段光柵化時,單一段落最多涵蓋幾頁 A4。
 *
 * 取 20:20 頁 × 1123px × scale 2 ≈ 44,920 px 高,離 65,535 有餘裕,
 * 同時段數不會多到讓 153 頁的輸出跑上數十輪(153 / 20 ≈ 8 段)。
 * 以「整頁數」而非固定像素為單位,是為了讓每一段的邊界都落在分頁線上 ——
 * 從半行字中間切開會讓那一行在兩頁各出現一半。
 */
export const PDF_SEGMENT_MAX_PAGES = 20;

// Info: (20260608 - Julian) A4 四邊留白(mm);與既有 html2pdf 設定的 margin 一致
export const PDF_EXPORT_MARGIN_MM = 15;

// Info: (20260426 - Luphia) 既有的 JPEG 壓縮品質(維持不變)
export const PDF_EXPORT_JPEG_QUALITY = 0.98;

/**
 * Info: (20260807 - Emily) 空白偵測用的降採樣邊長(px)。
 *
 * 取 128 而非更小:探針越小,細內容在降採樣後越容易被抹平。
 * 實測(無頭 Chromium + html2canvas 1.4.1)一張只有右下角頁碼的 A4:
 * 32×32 探針量到 2 個非背景像素,128×128 量到 9 個 —— 邊際差了四倍多。
 * 128² = 16,384 像素,getImageData 只有 64 KB,成本可以忽略。
 */
export const PDF_BLANK_PROBE_SIZE_PX = 128;

/**
 * Info: (20260807 - Emily) 判定為空白所需的「非背景像素數」上限(絕對值,不是比例)。
 *
 * 用絕對像素數而非比例,是因為比例會隨探針大小浮動,
 * 而這件事的物理意義其實與探針無關:真正的空白畫布是**恰好 0** 個非背景像素。
 * 實測白底、深色版面、灰底三種空白頁在 32/64/128 三種探針下都量到 0;
 * 而最稀疏的合法頁面(單一 8px 圖示)量到 4 個。取 3 落在兩者之間,
 * 且仍容得下一兩個抗鋸齒雜訊像素。
 */
export const PDF_BLANK_PROBE_MIN_INK_PIXELS = 3;

/**
 * Info: (20260807 - Emily) 為了避開圖表而提前分頁時,該頁至少要用掉的高度比例。
 *
 * 沒有下限的話會出事:一張圖若剛好落在頁首附近,分頁線就會被往上推到接近頁頂,
 * 於是產生一頁幾乎全白的頁。取 0.35 —— 少於三分之一的頁面內容就不值得為它多留一頁,
 * 寧可讓那張圖被切開,也不要在一份 92 頁的報告裡塞進一堆空白頁。
 */
export const PDF_PAGE_BREAK_MIN_FILL_RATIO = 0.35;
