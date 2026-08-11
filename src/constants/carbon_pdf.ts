import { PDF_FONT_STACK } from "@/constants/pdf_font";

/**
 * Info: (20260810 - Emily) 碳盤查報告的伺服端向量列印常數
 * (data/issue_drafts/inventory_table_import/17)。
 *
 * 為什麼改走伺服端列印:前端是把整份報告光柵化再切頁,而 html2canvas
 * **不執行任何列印規則** —— page-break-inside、break-inside、
 * thead: table-header-group 都是給瀏覽器列印引擎看的,它一條都不認。
 * 於是「不要切開這一列」「跨頁重印表頭」這些話寫了但沒有東西在聽:
 * 文字行與表格列被從中間切開,在那個架構下不是 bug 而是它的工作方式。
 *
 * 實測同一份報告(UAT 的高興昌盤查報告書,1807 行、26 張表、6 張圖):
 *   前端光柵化   112 頁、34 MB、可抽取文字 0 字元
 *   伺服端列印    46 頁、1.67 MB、可抽取文字 56,753 字元(中文可搜尋)
 * 對查證文件而言可搜尋不是加分項:查證人員要能複製任一個排放量數字。
 */

/** Info: (20260810 - Emily) 與 logistics 共用的列印字型堆疊(CJK 家族名涵蓋各平台) */
export const CARBON_PDF_FONT_STACK = PDF_FONT_STACK;

/**
 * Info: (20260810 - Emily) A4 邊界(mm)。上下留給頁尾頁碼與報告名稱。
 * 直式與橫式分開:橫式頁的上下邊界不需要跟直式一樣厚。
 */
export const CARBON_PDF_PORTRAIT_MARGIN_MM = {
  top: 16,
  right: 14,
  bottom: 16,
  left: 14,
} as const;

export const CARBON_PDF_LANDSCAPE_MARGIN_MM = {
  top: 14,
  right: 14,
  bottom: 14,
  left: 14,
} as const;

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MM_TO_PX = 96 / 25.4;

/**
 * Info: (20260810 - Emily) 可列印內容寬(CSS px),由紙張與邊界推導而非寫死。
 *
 * 必須推導:版面判定拿它當「放不放得下」的基準,而先前有一版誤用
 * `document.body.clientWidth`(= 視窗寬 1280px)——基準比真正的直式內容寬
 * 大了將近一倍,於是真正塞不下的表被判定為放得下。
 */
export const CARBON_PDF_PORTRAIT_CONTENT_PX = Math.round(
  (A4_WIDTH_MM -
    CARBON_PDF_PORTRAIT_MARGIN_MM.left -
    CARBON_PDF_PORTRAIT_MARGIN_MM.right) *
    MM_TO_PX,
);

export const CARBON_PDF_LANDSCAPE_CONTENT_PX = Math.round(
  (A4_HEIGHT_MM -
    CARBON_PDF_LANDSCAPE_MARGIN_MM.left -
    CARBON_PDF_LANDSCAPE_MARGIN_MM.right) *
    MM_TO_PX,
);

/** Info: (20260810 - Emily) 表格基準字級(pt) */
export const CARBON_PDF_TABLE_BASE_PT = 8.5;

/**
 * Info: (20260810 - Emily) 為了留在直式頁而容許縮到的最小字級。
 *
 * 只差一點就放得下的表,縮 0.5pt 比轉橫式划算得多 ——
 * 換頁樣式必然造成分頁,一次強制分頁的代價是整頁留白(UAT 回報的「奇怪的空白」)。
 * 但下限只到 8pt:再小就不是「稍微縮一下」而是犧牲可讀性,
 * 那種情況本來就該用橫式(客戶原始報告的評估表也是橫的)。
 */
export const CARBON_PDF_PORTRAIT_FLOOR_PT = 8;

/**
 * Info: (20260810 - Emily) 連橫式頁都放不下時容許縮到的最小字級。
 * 低於此值就不再縮 —— 縮到看不清的表格與溢出的表格一樣不能用,
 * 而後者至少看得出來出了問題。
 */
export const CARBON_PDF_MIN_PT = 6;

/**
 * Info: (20260810 - Emily) 圖表高度上限(mm)。
 * 超過一頁的圖必然被分頁線切開,而被切開的圖在查證場景裡等於沒有。
 */
export const CARBON_PDF_CHART_MAX_HEIGHT_MM = 190;

/**
 * Info: (20260810 - Emily) 單次請求可接受的 markdown 位元組上限。
 * UAT 那份 112 頁的報告是 124 KB,取 4 MB 留足餘裕,同時擋掉明顯異常的載荷。
 */
export const CARBON_PDF_MAX_MARKDOWN_BYTES = 4 * 1024 * 1024;

/**
 * Info: (20260810 - Emily) 等 Mermaid 把圖畫完的上限(ms)。
 * 逾時就以「該圖未能繪製」的說明取代 —— 少一張圖仍可交付,卡住不行。
 */
export const CARBON_PDF_MERMAID_TIMEOUT_MS = 20_000;

/**
 * Info: (20260810 - Emily) 匯出管線的切換(出問題可即刻切回前端光柵化)。
 * 沿用 logistics 的 TransportPdfExportModeEnum 慣例 ——
 * 同一種決策在兩處用同一種形狀表達,維運才不必記兩套。
 */
export enum CarbonPdfExportModeEnum {
  /** Info: (20260810 - Emily) 伺服端 Chrome 列印:向量文字、可搜尋 */
  SERVER_VECTOR = "SERVER_VECTOR",
  /** Info: (20260810 - Emily) 前端 html2canvas 分段光柵化:保留為回退路徑 */
  CLIENT_RASTER = "CLIENT_RASTER",
}

export const CARBON_PDF_EXPORT_MODE: CarbonPdfExportModeEnum =
  CarbonPdfExportModeEnum.SERVER_VECTOR;

/**
 * Info: (20260810 - Emily) 頁尾左側的文件名稱。
 * 標明草稿:這份輸出在人工查核完成前不是定稿,而 PDF 一旦離開系統就沒有其他脈絡
 * 能說明它的狀態 —— 每一頁都要說得出自己是什麼。
 */
export const CARBON_PDF_FOOTER_TITLE = "iSunFA 溫室氣體盤查報告書（草稿）";
