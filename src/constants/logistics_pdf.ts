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
 * Info: (20260731 - Tzuhan) 已知限制:中文字在輸出的 PDF 內是**點陣字(Type 3)**,不是向量。
 *
 * 實測 `pdffonts` 的結果:拉丁字走 CID TrueType 子集(ArialMT、Menlo-Bold),
 * 但樣板內 19 個相異中文字各自成為一個 Type 3 字型物件 —— Chrome 在找不到可嵌入的
 * 中文字型時會把字符光柵化。後果是這些字放大會模糊,且約佔檔案 60 KB。
 *
 * 搜尋與複製**仍然可用**(ToUnicode 對照表有保留),所以不影響本次的核心目標。
 * 要修的正解是提供可嵌入的中文字型(在執行環境安裝 Noto Sans TC,或以 @font-face
 * 內嵌字型檔讓 Chrome 自行子集化);列為後續 issue,不在本次範圍。
 */
export const LOGISTICS_PDF_CJK_IS_BITMAP = true;

/**
 * Info: (20260731 - Tzuhan) 地圖影像的體積上限。地圖是這份報告唯一的真實光柵內容,
 * 超過即不嵌入並在報告中明示「地圖略過」——寧可少一張圖,也不要交付寄不出去的檔案。
 *
 * Info: (20260731 - Tzuhan) 自 60 KB 放寬為 200 KB。原值是在「整份 100 KB」的前提下推算的,
 * 預算放寬到 500 KB 後它反而成了品質瓶頸:實測嵌入的地圖只有 700×526 @93 ppi
 * (列印時明顯偏軟,A4 寬度需要約 175 ppi 才紮實),而 Retina 螢幕截下的兩倍圖
 * 會超過 60 KB 被前端丟掉。放寬後較清晰的地圖才進得來。
 */
export const LOGISTICS_PDF_MAP_MAX_BYTES = 200 * 1024;

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
 * Info: (20260731 - Tzuhan) 取單張地圖影像的逾時。
 * `captureMap()` 等的是 MapLibre 的 `render` 事件;若該實例的 WebGL context 已失效
 * (離屏連續 remount 數十次時會發生),事件永遠不會來,await 就無限期卡住整個匯出。
 * 逾時即該份不附地圖 —— 少一張圖遠優於使用者盯著一個永不結束的轉圈。
 */
export const CARBON_MAP_CAPTURE_TIMEOUT_MS = 6_000;

/**
 * Info: (20260731 - Tzuhan) 地圖在報告中的顯示寬度(CSS 像素基準)。
 * 比例尺的長度是「距離 ÷ 每像素公尺數」,而那個像素數指的是**顯示尺寸**而非原始影像尺寸,
 * 所以必須有一個共同基準。A4 內容區寬約 190mm,以 96dpi 換算約 718px;
 * 逐段小圖為兩欄,各約一半。這個值只影響比例尺線段的相對長度,不影響影像本身。
 */
export const LOGISTICS_PDF_MAP_RENDER_WIDTH_PX = 718;

/**
 * Info: (20260731 - Tzuhan) 逐段小圖的顯示寬度:兩欄版面,扣掉 3mm 間距後約一半。
 * 必須與全程圖分開,否則比例尺的線段長度會差一倍 —— 而長度錯的比例尺等於錯的證據。
 */
export const LOGISTICS_PDF_LEG_MAP_RENDER_WIDTH_PX = 348;

/**
 * Info: (20260731 - Tzuhan) 只接受 JPEG/PNG 的 data URL 作為地圖影像:
 * 這個字串會被放進 HTML 的 img src 交給 Chrome,必須先把 javascript: 之類的協定擋在門外。
 */
export const LOGISTICS_PDF_MAP_DATA_URL_PATTERN =
  /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+=*$/;
