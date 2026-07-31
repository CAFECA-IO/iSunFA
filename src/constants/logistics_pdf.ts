// Info: (20260731 - Tzuhan) 運輸報告 PDF(向量列印)的版面與體積常數
// Info: (20260731 - Tzuhan) 為什麼改走伺服端列印:前端 html-to-image + jsPDF 是把整份報告光柵化,
// Info: (20260731 - Tzuhan) 實測開啟 compress 後仍為 500 KB —— 一頁 A4 的文字在可讀 DPI 下就是 60~150 KB,
// Info: (20260731 - Tzuhan) 這是編碼下限而非參數沒調好。Chrome 列印輸出向量文字並自動做字型子集化,
// Info: (20260731 - Tzuhan) 同時讓 PDF 內的文字可選取、可搜尋、可被查核者複製 —— 對審計文件而言比體積更有價值。
// Info: (20260731 - Tzuhan) 既有同類實作見 dpp.service.ts(數位產品護照以 mdToPdf 產出 A4 PDF)。

/**
 * Info: (20260731 - Tzuhan) A4 邊界。上緣留 12mm 給報告標頭,下緣留 14mm 給頁尾頁碼與版權
 */
export const LOGISTICS_PDF_MARGIN = {
  top: "12mm",
  right: "10mm",
  bottom: "14mm",
  left: "10mm",
} as const;

/**
 * Info: (20260731 - Tzuhan) 列印字體堆疊。刻意不引入網路字型:
 * 一是離線列印仍須正確排版,二是外部字型會讓 Chrome 嵌入額外子集、增加體積。
 * 中日韓字符交由系統字型(伺服器與使用者端皆有)處理。
 */
export const LOGISTICS_PDF_FONT_STACK =
  '-apple-system, "Noto Sans TC", "Microsoft JhengHei", "PingFang TC", "Helvetica Neue", Arial, sans-serif';

/**
 * Info: (20260731 - Tzuhan) 地圖影像的體積上限。地圖是這份報告唯一的真實光柵內容,
 * 因此它決定了整份 PDF 能否守住預算:文字向量約 25~40 KB,地圖必須壓在此值內才進得了 100 KB。
 * 超過即不嵌入並在報告中明示「地圖略過」——寧可少一張圖,也不要交付寄不出去的檔案。
 */
export const LOGISTICS_PDF_MAP_MAX_BYTES = 60 * 1024;

/**
 * Info: (20260731 - Tzuhan) 單次請求可產生的報告份數上限:每份都要跑一次 Chrome 排版與列印,
 * 無上限的批次會讓單一請求佔用伺服器過久(逾時與資源耗盡的典型來源)。
 * 27 條路線 × 最多 5 種方案是實務上見過的量級,取 60 留有餘裕。
 */
export const LOGISTICS_PDF_MAX_REPORTS_PER_REQUEST = 60;

/**
 * Info: (20260731 - Tzuhan) 匯出管線的切換(issue 08 步驟二~四的回退閘門)。
 *
 * 實測基準(單筆陸運報告,前端光柵化 + compress):296 KB、1 頁、單張 2048×2896 @248dpi 的影像,
 * 該影像佔檔案 **99%**,且 `pdftotext` 抽得出 1 byte —— 整頁沒有任何可選取的文字。
 * (未開 compress 時同一張圖是 17 MB,那是先前 >20 MB 的成因。)
 *
 * 這組數字說明兩件事:壓縮修正已到極限,而「可搜尋」在光柵路徑下永遠是 0。
 */
export enum TransportPdfExportModeEnum {
  /** Info: (20260731 - Tzuhan) 伺服端 Chrome 列印:向量文字、可搜尋、預估數十 KB */
  SERVER_VECTOR = "SERVER_VECTOR",
  /** Info: (20260731 - Tzuhan) 前端 html-to-image + jsPDF:保留為回退路徑,出問題可即刻切回 */
  CLIENT_RASTER = "CLIENT_RASTER",
}

export const TRANSPORT_PDF_EXPORT_MODE: TransportPdfExportModeEnum =
  TransportPdfExportModeEnum.SERVER_VECTOR;

/**
 * Info: (20260731 - Tzuhan) 每次請求送幾份。分批而非一次送完的理由:
 * 進度條仍有粒度可更新、單次載荷更小、某批失敗只需重試該批。
 * 8 份約對應 3~7 秒的伺服端工作量,是「使用者感覺有進展」與「請求數不過多」的折衷。
 */
export const LOGISTICS_PDF_REQUEST_BATCH_SIZE = 8;

/**
 * Info: (20260731 - Tzuhan) 只接受 JPEG/PNG 的 data URL 作為地圖影像:
 * 這個字串會被放進 HTML 的 img src 交給 Chrome,必須先把 javascript: 之類的協定擋在門外。
 */
export const LOGISTICS_PDF_MAP_DATA_URL_PATTERN =
  /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+=*$/;
