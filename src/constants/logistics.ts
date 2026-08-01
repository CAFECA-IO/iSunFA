// Info: (20260724 - Tzuhan) 運輸物流單一來源常數:排放係數與運輸方式適用性門檻
// Info: (20260724 - Tzuhan) 嚴禁在 service/component 內硬編碼下列數值(曾出現 0.01614/0.50422 錯誤係數殘留)

/**
 * Info: (20260724 - Tzuhan) 排放係數 (kg CO₂e / t-km)
 * 以字串保存,計算時一律經 MoneyUtil.toDecimal 轉 Decimal,禁止原生浮點運算
 */
export const EMISSION_FACTORS = {
  LAND: "0.11289",
  SEA: "0.01045",
  AIR: "0.6023",
} as const;

export type EmissionFactorMode = keyof typeof EMISSION_FACTORS;

/**
 * Info: (20260801 - Luphia) 路徑資料不可用時的直線距離加成係數(tortuosity factor)。
 *
 * **必須由此處供給演算法與揭露文字兩邊。** 先前三處各自寫死:
 * route.service.ts:169 陸運 ×1.2、route.sea.ts:379 海運 ×1.5,
 * 而報告的揭露文字只寫「直線距離 × 1.2」—— 被標成 est. 的海運段實際是 ×1.5,
 * 揭露值是錯的。查核者若照揭露值回推距離會得到錯誤的結果,
 * 而這正是一份審計文件最不該出現的事。
 *
 * 空運無此係數:空運距離即大圓距離本身(route.air.ts 從不設 isFallback),
 * 沒有「路徑資料不可用」的狀態可退。
 */
/**
 * Info: (20260801 - Luphia) 接駁機場的採用條件。
 *
 * 先前 getNearestAirport 對 airports.json 全部 5,277 筆暴力取最近者,**完全不篩選**,
 * 因此軍用基地、南極科考跑道與重複紀錄都可能因為距離最近而被選為接駁機場。
 *
 * **要求具備 IATA 代碼**排除 714 筆。IATA 由 IATA 組織核發給有商業客貨運作的場站,
 * 是這份資料裡唯一能用來判斷「是否為商業機場」的欄位。
 *
 * **這是部分改善,不是完整解決 —— 實測數字如下,不可誇大:**
 *
 *   類別                總數    篩選後仍留
 *   軍用基地(名稱含 Air Base 等)  485      114
 *   [Duplicate] 重複紀錄           6        2
 *   Skiway / Runway               5        1
 *
 * 也就是仍有 114 個軍用基地持有 IATA 代碼而通過篩選(如 Bezmer Air Base、
 * Utti Air Base),以及 2 筆重複紀錄(如 [Duplicate] Wolf's Fang Runway)。
 * 名稱比對不列為條件:以字串猜測用途會誤傷合法場站
 * (例如民用與空軍共用的機場),那比漏掉更糟。
 *
 * **另一個此條件解決不了的問題:** IATA 只證明「有商業運作」,不證明「有貨運能力」。
 * 實測巴黎的最近機場是 Paris-Le Bourget(LBG)—— 商務航空機場而非貨運樞紐,
 * 真正的貨運樞紐是較遠的 Charles de Gaulle(CDG);但 LBG 同為 large_airport
 * 且有 IATA,此條件留不住這個問題。要修正需要貨運吞吐量或貨運航線資料,
 * 而 airports.json 沒有這些欄位。
 *
 * size 不列入條件:實測資料只有 large_airport(1,182)與 medium_airport(4,095),
 * 沒有 small —— 對這份資料而言「排除小型機場」是空操作。
 * 限定 large 會讓可選池從 4,563 縮到 1,178,把短程接駁推向更遠的大型樞紐,
 * 那是改變業務規則而非修正缺陷,不在此範圍。
 */
export const AIRPORT_SELECTION_REQUIRES_IATA = true;

export const ESTIMATION_TORTUOSITY_FACTORS = {
  /** Info: (20260430 - Tzuhan) 陸運:實際道路較直線繞行,取 1.2 */
  LAND: 1.2,
  /** Info: (20260501 - Luphia) 海運:航道受陸塊與海峽限制,繞行幅度大於陸運,取 1.5 */
  SEA: 1.5,
} as const;

export const EMISSION_FACTOR_UNIT = "kg CO₂e / t-km";

export const EMISSION_FACTOR_SOURCES = {
  LAND: "UK DEFRA 2025 (HGV)",
  SEA: "UK DEFRA 2025 (Container ship)",
  AIR: "UK DEFRA 2025 (Long-haul)",
} as const;

/**
 * Info: (20260724 - Tzuhan) 運輸方式適用性門檻(決定論規則,禁止交由 LLM 判斷)
 * MIN_SEA_LEG_DISTANCE_KM:港到港距離低於此值視為同港/鄰港退化案例,海運不適用
 * MIN_AIR_LEG_DISTANCE_KM:機場到機場距離低於此值無商業空運航班意義,空運不適用
 */
export const MIN_SEA_LEG_DISTANCE_KM = 10;
export const MIN_AIR_LEG_DISTANCE_KM = 100;

/**
 * Info: (20260724 - Tzuhan) 匯出方案類型 → PDF 檔名後綴(需求二:一份 PDF 一個方案,檔名可辨識)
 * key 對齊 RouteType("land" | "sea" | "air" | "custom")
 */
export const EXPORT_PLAN_FILE_SUFFIX = {
  land: "land_only",
  sea: "sea_multimodal",
  air: "air_multimodal",
  // Info: (20260729 - Tzuhan) issue 10:海陸空聯運
  seaLandAir: "sea_land_air_multimodal",
  custom: "custom_multimodal",
} as const;

export type ExportPlanRouteType = keyof typeof EXPORT_PLAN_FILE_SUFFIX;

/**
 * Info: (20260729 - Tzuhan) 方案代碼:貫穿 PDF 與 CSV 的唯一交叉索引(需求:匯出物可互相對照)
 * 格式 R{路線序號兩位}-{模式碼},如 R01-SEA;CSV 每列帶同一代碼,PDF 標頭與檔名亦帶,
 * 使用者看到 CSV 的 3 列 R01-SEA 即知是「第 1 條路線的海陸聯運方案」且對應同名 PDF
 */
export const EXPORT_PLAN_CODE = {
  land: "LAND",
  sea: "SEA",
  air: "AIR",
  seaLandAir: "SLA",
  custom: "CUS",
} as const;

/**
 * Info: (20260729 - Tzuhan) 路線代碼:R01、R02…(超過 99 條自然延伸為三位,不截斷)
 */
export const buildRouteCode = (routeIndex: number): string =>
  `R${String(routeIndex + 1).padStart(2, "0")}`;

export const buildPlanCode = (
  routeIndex: number,
  planType: keyof typeof EXPORT_PLAN_CODE,
): string => `${buildRouteCode(routeIndex)}-${EXPORT_PLAN_CODE[planType]}`;

/**
 * Info: (20260724 - Tzuhan) 運輸計算器頁面的 URL query param 名稱(需求四:歷史導覽以 URL 為狀態來源)
 */
export const TRANSPORT_CALCULATOR_QUERY_PARAM = {
  TAB: "tab",
  ANALYSIS_ID: "analysisId",
} as const;

/**
 * Info: (20260724 - Tzuhan) 歷史清單瀏覽狀態(捲動位置/展開列)的 sessionStorage key
 * 僅存 UI 狀態,不存業務資料;分頁關閉即清空
 */
export const HISTORY_VIEW_STATE_STORAGE_KEY =
  "transport_calculator_history_view_state";

/**
 * Info: (20260731 - Tzuhan) PDF 匯出的截圖參數。這兩個值**直接決定檔案大小**,
 * 原本是散在 captureElementToPdf 裡的裸數字,體積出問題時無從調整,故抽出並記錄取捨。
 *
 * pixelRatio 2 = 以 CSS 像素兩倍解析度截圖(A4 寬約 175 DPI)。降到 1.5 約 130 DPI,
 * 文字仍清晰而像素數少 44%;實測體積若超出預算,這是第一個該調的旋鈕。
 */
export const PDF_EXPORT_PIXEL_RATIO = 2;

/**
 * Info: (20260731 - Tzuhan) html-to-image 的 quality 僅對 JPEG/WebP 生效,PNG 為無損。
 * 保留以維持既有行為,並提醒:報告是白底 + 文字 + 地圖,**PNG 無損壓縮遠優於 JPEG**
 * (同一張圖實測 PNG 138 KB / JPEG q70 1,198 KB),因此格式不要改成 JPEG。
 */
export const PDF_EXPORT_IMAGE_QUALITY = 0.95;

/**
 * Info: (20260731 - Tzuhan) 單份 PDF 的體積預算。超出僅警告,不阻擋下載 ——
 * 寧可交付過大的檔案,也不要讓使用者拿不到報告。
 *
 * 這個護欄存在的理由:體積曾在無人看管的情況下長到 22.5 MB(jsPDF 未開 compress,
 * PNG 被以未壓縮原始 RGB 嵌入)。修一行只解決當時那一張圖,常態量測才能防止回歸。
 *
 * Info: (20260731 - Tzuhan) 預算自 100 KB 放寬為 500 KB(2026-07-31,Emily 確認)。
 * 依據:伺服端向量列印的實測落點為 154 KB(其中地圖 32 KB、中文點陣字型約 60 KB),
 * 光柵路徑為 296 KB。兩者都在 500 KB 內,把預算訂在真實落點之上才有警示意義 ——
 * 訂 100 KB 會讓每次匯出都跳警告,警告一旦成為常態就等於沒有警告。
 */
export const PDF_EXPORT_SIZE_BUDGET_BYTES = 500 * 1024;
