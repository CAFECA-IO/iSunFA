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
 * Info: (20260731 - Tzuhan) 等 MapLibre 樣式載入完成的上限。
 * 首次載入要取樣式 JSON、字型與圖磚,比離屏元件的 2 秒 onReady 久得多。
 */
export const MAP_STYLE_READY_TIMEOUT_MS = 8_000;

/**
 * Info: (20260731 - Tzuhan) 視野變更後等重繪完成(idle)的上限。
 * 圖磚可能因網路遲遲不到;逾時就截當下畫面 —— 一張略糊的圖仍是證據。
 */
export const MAP_IDLE_TIMEOUT_MS = 3_000;

/**
 * Info: (20260731 - Tzuhan) 取單張地圖影像的整體逾時(呼叫端的安全網)。
 *
 * **必須大於內層所有等待的總和**,否則外層會在內層還在合理等待時把它砍掉,
 * 結果是「明明只要再等一秒就好」卻回報缺圖。實測踩過:外層 6s 小於
 * 內層 8s + 3s,第一條路線的空運段因此被判定缺圖。
 * 故此值由內層常數推導而非各自寫死 —— 讓這個不變式由結構保證,不靠註解提醒。
 */
export const CARBON_MAP_CAPTURE_TIMEOUT_MS =
  MAP_STYLE_READY_TIMEOUT_MS + MAP_IDLE_TIMEOUT_MS + 2_000;

/**
 * Info: (20260801 - Luphia) 地圖在報告中的顯示幾何,全部以公釐表示並由頁面版面推導。
 *
 * 改以 mm 為單位而非先前的 CSS 像素,是因為列印樣式本來就以 mm 撰寫,
 * 而比例尺要算的是「紙上一公釐代表多少公尺」。先前以 718 / 348 px 為基準,
 * 那組數字既不是影像的原始尺寸、也不是截圖畫布的尺寸,只是版面寬度的另一種寫法 ——
 * 拿它去除 metersPerPixel(基準為截圖畫布的 CSS 像素)在單位上就不成立,
 * 算出來的長度必然是錯的。
 *
 * 由 A4 尺寸與 LOGISTICS_PDF_MARGIN 推導而非各自寫死:邊界一旦調整,
 * 這些值會自動跟上,不會默默失去同步。
 */
const A4_WIDTH_MM = 210;

export const LOGISTICS_PDF_CONTENT_WIDTH_MM =
  A4_WIDTH_MM -
  Number.parseFloat(LOGISTICS_PDF_MARGIN.left) -
  Number.parseFloat(LOGISTICS_PDF_MARGIN.right);

/** Info: (20260801 - Luphia) 逐段小圖兩欄之間的間距,須與 `.legmaps` 的 grid gap 一致 */
export const LOGISTICS_PDF_LEG_MAP_GAP_MM = 3;

/** Info: (20260801 - Luphia) 全程圖佔滿內容區寬度 */
export const LOGISTICS_PDF_MAP_RENDER_WIDTH_MM = LOGISTICS_PDF_CONTENT_WIDTH_MM;

/**
 * Info: (20260801 - Luphia) 逐段小圖為兩欄:扣掉間距後對半。
 * 必須與全程圖分開,否則比例尺的線段長度會差一倍 —— 而長度錯的比例尺等於錯的證據。
 */
export const LOGISTICS_PDF_LEG_MAP_RENDER_WIDTH_MM =
  (LOGISTICS_PDF_CONTENT_WIDTH_MM - LOGISTICS_PDF_LEG_MAP_GAP_MM) / 2;

/**
 * Info: (20260801 - Luphia) 地圖的高度上限(mm)。原本只寫在 CSS 的 `max-height`,
 * 現在必須是常數:影像的實際顯示尺寸改由 TypeScript 決定性算出(computeRenderedMapSizeMm),
 * 而那個計算要知道高度上限才能判斷是寬度受限還是高度受限。
 * 兩處若不同步,算出的紙面尺寸就與實際排版不符,比例尺會再次失準。
 */
export const LOGISTICS_PDF_MAP_MAX_HEIGHT_MM = 70;

export const LOGISTICS_PDF_LEG_MAP_MAX_HEIGHT_MM = 46;

/**
 * Info: (20260731 - Tzuhan) 只接受 JPEG/PNG 的 data URL 作為地圖影像:
 * 這個字串會被放進 HTML 的 img src 交給 Chrome,必須先把 javascript: 之類的協定擋在門外。
 */
export const LOGISTICS_PDF_MAP_DATA_URL_PATTERN =
  /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+=*$/;
