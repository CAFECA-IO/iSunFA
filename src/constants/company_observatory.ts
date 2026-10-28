import path from "node:path";
import {
  FINANCIAL_FORMS,
  FINANCIAL_MARKET,
  FinancialForm,
  FinancialMarket,
  FinancialStatement,
} from "@/constants/company_financial";

/**
 * Info: (20261015 - Luphia) 企業觀測站：背景 worker 定期下載上市櫃公司的公開報告，
 * 切塊後索引至 LanceDB。狀態存在 `ObservatoryDocument`（見 prisma/schema.prisma）。
 *
 * 四個來源各有一支下載器（`src/services/company_observatory/*.downloader.ts`），
 * 共用同一套「規劃 → 下載 → 索引」狀態機與重試／死信規則。
 */

// Info: (20261015 - Luphia) 報告來源；同時是 `ObservatoryDocument.source` 與 LanceDB `source` 欄位的值
export const OBSERVATORY_SOURCE = {
  // Info: (20261015 - Luphia) 經濟部商業司公司登記（基本資料 + 董監事），年度快照
  GCIS_REGISTRATION: "GCIS_REGISTRATION",
  // Info: (20261015 - Luphia) 公開資訊觀測站電子書：年度（第四季）IFRSs 財務報告書 PDF
  MOPS_FINANCIAL_REPORT: "MOPS_FINANCIAL_REPORT",
  // Info: (20261023 - Luphia) 公開資訊觀測站電子書：第一～三季 IFRSs 財務報告書 PDF（只追蹤今年，第四季即年度報告）
  MOPS_FINANCIAL_REPORT_Q1: "MOPS_FINANCIAL_REPORT_Q1",
  MOPS_FINANCIAL_REPORT_Q2: "MOPS_FINANCIAL_REPORT_Q2",
  MOPS_FINANCIAL_REPORT_Q3: "MOPS_FINANCIAL_REPORT_Q3",
  // Info: (20261015 - Luphia) 證交所 ESG 數位平台：永續報告書 PDF
  ESG_REPORT: "ESG_REPORT",
  // Info: (20261015 - Luphia) 證交所 ESG 數位平台：溫室氣體盤查揭露（範疇一～三、確信機構與標準）
  GHG_INVENTORY: "GHG_INVENTORY",
} as const;

export type ObservatorySource =
  (typeof OBSERVATORY_SOURCE)[keyof typeof OBSERVATORY_SOURCE];

export const OBSERVATORY_SOURCES: readonly ObservatorySource[] =
  Object.values(OBSERVATORY_SOURCE);

/**
 * Info: (20261015 - Luphia) 文件狀態。
 *
 * PENDING ──下載──▶ DOWNLOADED ──索引──▶ INDEXED
 *    │                  │
 *    ├─來源查無─▶ NOT_AVAILABLE（過一段時間再查，不計失敗）
 *    └─失敗─▶ FAILED（退避後重試）──達上限──▶ DEAD（死信，需人工 requeue）
 *
 * 索引失敗不退回 FAILED（那會重新下載），而是留在 DOWNLOADED 並延後；達上限同樣進 DEAD。
 */
export const OBSERVATORY_DOCUMENT_STATUS = {
  PENDING: "PENDING",
  DOWNLOADED: "DOWNLOADED",
  INDEXED: "INDEXED",
  NOT_AVAILABLE: "NOT_AVAILABLE",
  FAILED: "FAILED",
  DEAD: "DEAD",
} as const;

export type ObservatoryDocumentStatus =
  (typeof OBSERVATORY_DOCUMENT_STATUS)[keyof typeof OBSERVATORY_DOCUMENT_STATUS];

export const OBSERVATORY_DOCUMENT_STATUSES: readonly ObservatoryDocumentStatus[] =
  Object.values(OBSERVATORY_DOCUMENT_STATUS);

export const OBSERVATORY_CONTENT_TYPE = {
  PDF: "application/pdf",
  TEXT: "text/plain",
} as const;

export type ObservatoryContentType =
  (typeof OBSERVATORY_CONTENT_TYPE)[keyof typeof OBSERVATORY_CONTENT_TYPE];

export const OBSERVATORY_FETCH_OUTCOME = {
  FOUND: "FOUND",
  NOT_AVAILABLE: "NOT_AVAILABLE",
} as const;

/**
 * Info: (20261015 - Luphia) 快照型來源：`year` 是抓取當年，不是報告所屬年度（公司登記資料每年一份快照）。
 * 依年度過濾切塊時這些來源一律保留——問「台泥 2024 年的董事長」也該看得到最新的登記資料。
 */
export const OBSERVATORY_SNAPSHOT_SOURCES: readonly ObservatorySource[] = [
  OBSERVATORY_SOURCE.GCIS_REGISTRATION,
];

// Info: (20261015 - Luphia) 報告類型的中文名稱，寫進每個切塊的標頭，讓檢索結果自帶脈絡
export const OBSERVATORY_SOURCE_LABEL: Record<ObservatorySource, string> = {
  GCIS_REGISTRATION: "公司登記資料",
  MOPS_FINANCIAL_REPORT: "財務報告",
  MOPS_FINANCIAL_REPORT_Q1: "第一季財務報告",
  MOPS_FINANCIAL_REPORT_Q2: "第二季財務報告",
  MOPS_FINANCIAL_REPORT_Q3: "第三季財務報告",
  ESG_REPORT: "永續報告書",
  GHG_INVENTORY: "溫室氣體盤查",
};

// ---------------------------------------------------------------------------
// Info: (20261015 - Luphia) 重試與死信（CLAUDE.md §6）
// ---------------------------------------------------------------------------

// Info: (20261015 - Luphia) 同一份文件最多失敗幾次就進死信（DEAD）
export const OBSERVATORY_MAX_ATTEMPTS = 3;
// Info: (20261015 - Luphia) 失敗後的退避：1 小時、4 小時（第三次失敗即進死信）
export const OBSERVATORY_RETRY_BASE_DELAY_MS = 60 * 60 * 1000;
export const OBSERVATORY_RETRY_BACKOFF_FACTOR = 4;
/**
 * Info: (20261015 - Luphia) 來源查無報告時多久再查一次。
 * 年報與永續報告書是陸續公告的（永續報告書多在次年 8 月底前），查無不是錯誤，只是還沒到。
 */
export const OBSERVATORY_NOT_AVAILABLE_RECHECK_MS = 7 * 24 * 60 * 60 * 1000;
/**
 * Info: (20261015 - Luphia) 已索引的文件多久重新下載一次；null = 已公告的報告不會再變，不重抓。
 * 公司登記資料（董監事、資本額）會隨時變更，每 30 天比對一次；內容雜湊沒變就不重建索引。
 */
export const OBSERVATORY_REFRESH_AFTER_MS: Record<
  ObservatorySource,
  number | null
> = {
  GCIS_REGISTRATION: 30 * 24 * 60 * 60 * 1000,
  MOPS_FINANCIAL_REPORT: null,
  MOPS_FINANCIAL_REPORT_Q1: null,
  MOPS_FINANCIAL_REPORT_Q2: null,
  MOPS_FINANCIAL_REPORT_Q3: null,
  ESG_REPORT: null,
  GHG_INVENTORY: null,
};

/**
 * Info: (20261023 - Luphia) 依法定申報期限決定「查無」之後多久再查（申報季感知排程）。
 *
 * 期限取自公開資訊觀測站彙總報表頁的註 1（20261023 實測）：一般業第一季 5/15、第二季 8/14、第三季 11/14、
 * 年度 3/31；金控業第一季 5/30、第二季 8/31、第三季 11/29；銀行與保險業第二季 8/31。
 * 不分業別，取各業別最晚的期限，讓視窗涵蓋所有公司。永續報告書（與同平台的溫室氣體揭露）為次年 8/31。
 *
 * - 期間還沒結束：不可能有報告，下次查詢排在期間結束後一天。
 * - 期間結束到期限後 14 天（申報季）：每天查。
 * - 其餘時間（早已過期限的補件、更正）：每 30 天查一次。
 * 公司登記不在表內（現況快照，沿用固定的 7 天重查）。
 */
export interface IFilingDate {
  // Info: (20261023 - Luphia) 相對於報告年度的年份位移（年度報告的期限在次年 → 1）
  yearOffset: number;
  month: number;
  day: number;
}

export interface IFilingSchedule {
  periodEnd: IFilingDate;
  deadline: IFilingDate;
}

export const OBSERVATORY_FILING_SCHEDULE: Partial<
  Record<ObservatorySource, IFilingSchedule>
> = {
  MOPS_FINANCIAL_REPORT: {
    periodEnd: { yearOffset: 0, month: 12, day: 31 },
    deadline: { yearOffset: 1, month: 3, day: 31 },
  },
  MOPS_FINANCIAL_REPORT_Q1: {
    periodEnd: { yearOffset: 0, month: 3, day: 31 },
    deadline: { yearOffset: 0, month: 5, day: 30 },
  },
  MOPS_FINANCIAL_REPORT_Q2: {
    periodEnd: { yearOffset: 0, month: 6, day: 30 },
    deadline: { yearOffset: 0, month: 8, day: 31 },
  },
  MOPS_FINANCIAL_REPORT_Q3: {
    periodEnd: { yearOffset: 0, month: 9, day: 30 },
    deadline: { yearOffset: 0, month: 11, day: 29 },
  },
  ESG_REPORT: {
    periodEnd: { yearOffset: 0, month: 12, day: 31 },
    deadline: { yearOffset: 1, month: 8, day: 31 },
  },
  GHG_INVENTORY: {
    periodEnd: { yearOffset: 0, month: 12, day: 31 },
    deadline: { yearOffset: 1, month: 8, day: 31 },
  },
};

export const OBSERVATORY_FILING_SEASON_RECHECK_MS = 24 * 60 * 60 * 1000;
export const OBSERVATORY_OFF_SEASON_RECHECK_MS = 30 * 24 * 60 * 60 * 1000;
export const OBSERVATORY_FILING_GRACE_MS = 14 * 24 * 60 * 60 * 1000;

// Info: (20261023 - Luphia) 只追蹤今年的來源（季報：上一年度的第一～三季由年度報告涵蓋）
export const OBSERVATORY_CURRENT_YEAR_SOURCES: readonly ObservatorySource[] = [
  OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT_Q1,
  OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT_Q2,
  OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT_Q3,
];

// Info: (20261023 - Luphia) MOPS 電子書檔名裡的季別（`202501_2330_AI1.pdf` 的 01）
export const MOPS_SEASON_OF_SOURCE = {
  MOPS_FINANCIAL_REPORT_Q1: "01",
  MOPS_FINANCIAL_REPORT_Q2: "02",
  MOPS_FINANCIAL_REPORT_Q3: "03",
} as const;

// ---------------------------------------------------------------------------
// Info: (20261015 - Luphia) 排程
// ---------------------------------------------------------------------------

/**
 * Info: (20261015 - Luphia) 年度報告追蹤最近幾個「已結束」的年度。
 * 今年的年報要明年才公告，所以從去年往回數；公司登記是快照，固定只建今年一列。
 */
export const OBSERVATORY_ANNUAL_YEARS_BACK = 2;
// Info: (20261015 - Luphia) 規劃迴圈：每日補建待下載清單
export const OBSERVATORY_PLAN_INTERVAL_MS = 24 * 60 * 60 * 1000;
// Info: (20261015 - Luphia) 下載與索引迴圈：每 10 分鐘消化一小批，搭配逐站限速把流量攤平
export const OBSERVATORY_PROCESS_INTERVAL_MS = 10 * 60 * 1000;
// Info: (20261015 - Luphia) 每一輪每個來源最多下載幾份
export const OBSERVATORY_DOWNLOAD_BATCH_PER_SOURCE = 5;
// Info: (20261015 - Luphia) 每一輪最多索引幾份（嵌入向量在本機 Ollama 上跑，量要節制）
export const OBSERVATORY_INDEX_BATCH = 5;
// Info: (20261015 - Luphia) createMany 單批筆數
export const OBSERVATORY_PLAN_CREATE_CHUNK = 1000;

// ---------------------------------------------------------------------------
// Info: (20261015 - Luphia) 來源網址與速率限制
// ---------------------------------------------------------------------------

export const OBSERVATORY_HOST = {
  GCIS: "data.gcis.nat.gov.tw",
  MOPS_DOC: "doc.twse.com.tw",
  ESG_PLATFORM: "esggenplus.twse.com.tw",
  // Info: (20261023 - Luphia) 財務數字：證交所與櫃買中心的 OpenAPI
  TWSE_OPENAPI: "openapi.twse.com.tw",
  TPEX_OPENAPI: "www.tpex.org.tw",
  // Info: (20261023 - Luphia) 歷史財務數字回補：公開資訊觀測站彙總報表
  MOPS_SUMMARY: "mopsov.twse.com.tw",
} as const;

/**
 * Info: (20261015 - Luphia) 同一主機兩次請求之間的最短間隔。
 * MOPS 電子書在密集查詢時會回「查詢過繁」並暫時封鎖，給最寬的間隔；
 * ESG 平台的報告書與溫室氣體兩個來源共用同一主機，由同一個限速器排隊。
 */
/**
 * Info: (20261023 - Luphia) 各來源打的是哪一台主機。限流是主機層級的：MOPS 電子書回「查詢過繁」時，
 * 年報與第一～三季（四個來源、同一台主機）在這一輪都要停，不能換個來源繼續打。
 */
export const OBSERVATORY_SOURCE_HOST: Record<ObservatorySource, string> = {
  GCIS_REGISTRATION: OBSERVATORY_HOST.GCIS,
  MOPS_FINANCIAL_REPORT: OBSERVATORY_HOST.MOPS_DOC,
  MOPS_FINANCIAL_REPORT_Q1: OBSERVATORY_HOST.MOPS_DOC,
  MOPS_FINANCIAL_REPORT_Q2: OBSERVATORY_HOST.MOPS_DOC,
  MOPS_FINANCIAL_REPORT_Q3: OBSERVATORY_HOST.MOPS_DOC,
  ESG_REPORT: OBSERVATORY_HOST.ESG_PLATFORM,
  GHG_INVENTORY: OBSERVATORY_HOST.ESG_PLATFORM,
};

export const OBSERVATORY_HOST_MIN_INTERVAL_MS: Record<string, number> = {
  [OBSERVATORY_HOST.GCIS]: 2000,
  [OBSERVATORY_HOST.MOPS_DOC]: 5000,
  [OBSERVATORY_HOST.ESG_PLATFORM]: 3000,
  [OBSERVATORY_HOST.TWSE_OPENAPI]: 2000,
  [OBSERVATORY_HOST.TPEX_OPENAPI]: 2000,
  [OBSERVATORY_HOST.MOPS_SUMMARY]: 5000,
};

/**
 * Info: (20261023 - Luphia) 公開資訊觀測站彙總報表（綜合損益表 t163sb04、資產負債表 t163sb05）：
 * POST 市場別、民國年、季別，回傳該期全部公司（依報表格式分表）。欄位名稱與 OpenAPI 相同，
 * 數值帶千分位、空值寫成「--」；查不到時頁面寫「查詢無資料」。
 */
export const MOPS_SUMMARY_URL: Record<FinancialStatement, string> = {
  INCOME: `https://${OBSERVATORY_HOST.MOPS_SUMMARY}/mops/web/ajax_t163sb04`,
  BALANCE: `https://${OBSERVATORY_HOST.MOPS_SUMMARY}/mops/web/ajax_t163sb05`,
};
export const MOPS_SUMMARY_EMPTY_MARKER = "查詢無資料";

/**
 * Info: (20261023 - Luphia) 財務數字的 OpenAPI 端點：上市（L）、上櫃（O）各 6 種報表格式 ×
 * 綜合損益表（t187ap06）與資產負債表（t187ap07），共 24 支；每支一次回傳該市場全部公司的最新一期。
 */
export interface IFinancialOpenApiEndpoint {
  url: string;
  statement: FinancialStatement;
  form: FinancialForm;
  market: FinancialMarket;
}

const FINANCIAL_STATEMENT_TABLE: Record<FinancialStatement, string> = {
  INCOME: "t187ap06",
  BALANCE: "t187ap07",
};

export const FINANCIAL_OPENAPI_ENDPOINTS: readonly IFinancialOpenApiEndpoint[] =
  FINANCIAL_FORMS.flatMap((form) =>
    (Object.keys(FINANCIAL_STATEMENT_TABLE) as FinancialStatement[]).flatMap(
      (statement) => [
        {
          url: `https://${OBSERVATORY_HOST.TWSE_OPENAPI}/v1/opendata/${FINANCIAL_STATEMENT_TABLE[statement]}_L_${form}`,
          statement,
          form,
          market: FINANCIAL_MARKET.LISTED,
        },
        {
          url: `https://${OBSERVATORY_HOST.TPEX_OPENAPI}/openapi/v1/mopsfin_${FINANCIAL_STATEMENT_TABLE[statement]}_O_${form}`,
          statement,
          form,
          market: FINANCIAL_MARKET.OTC,
        },
      ],
    ),
  );

// Info: (20261023 - Luphia) 財務數字每日同步一次（來源每日出表；24 支請求，逐主機限速）
export const FINANCIAL_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;
/**
 * Info: (20261028 - Luphia) 每日工作（規劃、財務同步）的迴圈多久醒一次，檢查開關與是否到期。
 * 後台打開或關閉企業觀測站後，最久這麼久就生效。
 */
export const OBSERVATORY_SCHEDULE_POLL_MS = 10 * 60 * 1000;
// Info: (20261023 - Luphia) 寫入時每批筆數（一支端點約 1,000 家 × 20～60 個科目）
export const FINANCIAL_FACT_WRITE_CHUNK = 5000;
export const OBSERVATORY_DEFAULT_HOST_MIN_INTERVAL_MS = 3000;
// Info: (20261015 - Luphia) PDF 動輒數十 MB，逾時放寬；HTTP 層自身的重試次數壓低，失敗交給文件層的退避
export const OBSERVATORY_HTTP_TIMEOUT_MS = 120 * 1000;
export const OBSERVATORY_HTTP_MAX_RETRIES = 2;
export const OBSERVATORY_HTTP_RETRY_BASE_DELAY_MS = 5000;
export const OBSERVATORY_USER_AGENT =
  "Mozilla/5.0 (compatible; iSunFA-CompanyObservatory/1.0; +https://isunfa.com)";

// Info: (20261015 - Luphia) 經濟部商業司資料開放平臺 API（以統一編號查詢）
export const GCIS_COMPANY_BASIC_URL =
  "https://data.gcis.nat.gov.tw/od/data/api/5F64D864-61CB-4D0D-8AD9-492047CC1EA6";
export const GCIS_COMPANY_DIRECTORS_URL =
  "https://data.gcis.nat.gov.tw/od/data/api/4E5F7653-1B91-4DDC-99D5-468530FAE396";
export const GCIS_PAGE_SIZE = 500;

// Info: (20261015 - Luphia) 公開資訊觀測站電子書查詢（Big5 HTML）
export const MOPS_DOC_QUERY_URL = "https://doc.twse.com.tw/server-java/t57sb01";
export const MOPS_DOC_ORIGIN = "https://doc.twse.com.tw";
// Info: (20261015 - Luphia) 電子書資料類型 A = 財務報告書
export const MOPS_DOC_KIND_FINANCIAL = "A";
// Info: (20261015 - Luphia) 年度報告取第四季；檔名後綴優先序：AI1 = IFRSs 合併財報、AI3 = IFRSs 個體財報
export const MOPS_ANNUAL_SEASON = "04";
export const MOPS_FINANCIAL_FILE_SUFFIXES = ["AI1", "AI3"] as const;
export const MOPS_THROTTLE_MARKERS = ["查詢過繁", "查詢過於頻繁"] as const;
export const MOPS_DOC_ENCODING = "big5";

// Info: (20261015 - Luphia) 證交所 ESG 數位平台
export const ESG_REPORT_LIST_URL =
  "https://esggenplus.twse.com.tw/api/api/MopsSustainReport/data";
export const ESG_REPORT_FILE_URL =
  "https://esggenplus.twse.com.tw/api/api/MopsSustainReport/data/FileStream";
export const ESG_METRICS_URL =
  "https://esggenplus.twse.com.tw/api/api/mopsEsg/singleCompanyData";
export const ESG_PLATFORM_ORIGIN = "https://esggenplus.twse.com.tw";
export const ESG_EMPTY_FILE_ID = "00000000-0000-0000-0000-000000000000";
export const ESG_MARKET_TYPE_CODE: Record<string, number> = {
  sii: 0,
  otc: 1,
};
// Info: (20261015 - Luphia) ESG 揭露項目中屬於碳盤查的部分（以項目名稱比對）
export const GHG_DECLARE_ITEM_KEYWORD = "溫室氣體";

export const PDF_MAGIC_BYTES = "%PDF";

// ---------------------------------------------------------------------------
// Info: (20261015 - Luphia) 儲存與索引
// ---------------------------------------------------------------------------

// Info: (20261015 - Luphia) 原始檔存放處；data/ 已在 .gitignore
export const OBSERVATORY_STORAGE_DIR = path.join(
  process.cwd(),
  "data",
  "company_observatory",
);

/**
 * Info: (20261022 - Luphia) 下載回來是 PDF 的來源。只有它們的切塊頁碼對應到原始檔的真實頁面；
 * 公司登記與溫室氣體是渲染出來的純文字，切塊上的「第 1 頁」不是任何文件的頁碼，引用時不顯示。
 */
export const OBSERVATORY_PDF_SOURCES: readonly ObservatorySource[] = [
  OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT,
  OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT_Q1,
  OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT_Q2,
  OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT_Q3,
  OBSERVATORY_SOURCE.ESG_REPORT,
];

/**
 * Info: (20261022 - Luphia) 手動匯入報告的 PDF 存放處（`scripts/import_pdfs.ts` 讀的就是這裡），
 * `Report.pdfPath` 存的是此目錄下的檔名。企業觀測站頁面的原始檔下載由此讀取。
 */
export const BUSINESS_MONITOR_LEGACY_PDF_DIR = path.join(process.cwd(), "pdfs");

// Info: (20261015 - Luphia) 獨立於 `company_reports` 的資料表：欄位不同，混用會讓舊的匯入腳本寫入失敗
export const OBSERVATORY_LANCE_TABLE = "company_observatory_chunks";
/**
 * Info: (20261015 - Luphia) 用 /api/embed 而不是舊的 /api/embeddings：前者回傳 L2 正規化後的向量，
 * LanceDB 預設的 L2 距離排序因此等同餘弦相似度，不會因為切塊長短不同、向量長度不同而偏差。
 */
export const OBSERVATORY_EMBED_URL = "http://localhost:11434/api/embed";
/**
 * Info: (20261015 - Luphia) 嵌入模型：bge-m3（多語、1024 維）。
 * 原本的 nomic-embed-text 以英文為主，對中文財報與永續報告書幾乎分不出主題
 * （評估見 scripts/eval_observatory_retrieval.ts）。企業觀測站與手動匯入的 `company_reports`
 * 共用這組設定，兩張表的向量才在同一個空間、距離可以比較。
 * 換模型會改變維度：兩張表都得重建，見 scripts/reindex_lance_db.ts。
 */
export const OBSERVATORY_EMBED_MODEL = "bge-m3";
export const OBSERVATORY_EMBED_DIMENSION = 1024;
export const OBSERVATORY_EMBED_CONCURRENCY = 5;
export const OBSERVATORY_CHUNK_SIZE = 800;
export const OBSERVATORY_CHUNK_OVERLAP = 100;
/**
 * Info: (20261015 - Luphia) 混合檢索：向量與全文（BM25）各取這麼多候選，再以倒數排名融合（RRF）合併。
 * 嵌入模型擅長語意相近、全文檢索擅長「範疇一」「每股盈餘」這類必須字面命中的專有名詞，
 * 兩者互補；候選取多一點，融合後才有東西可以往前排。
 */
export const OBSERVATORY_RETRIEVAL_CANDIDATES = 30;
// Info: (20261015 - Luphia) RRF 的平滑常數，文獻與各家實作的慣用值；越大越不偏重第一名
export const OBSERVATORY_RRF_K = 60;
/**
 * Info: (20261015 - Luphia) 全文索引以字元二元組（bigram）切詞：中文沒有空白分詞，
 * 二元組不需要詞典就能讓「範疇一」「營業收入」這類詞以字面命中，英數字也一併適用。
 */
export const OBSERVATORY_FTS_NGRAM_LENGTH = 2;
// Info: (20261015 - Luphia) 檢索方式：線上一律混合；單一路只給評估腳本比較用
export const OBSERVATORY_SEARCH_MODE = {
  HYBRID: "hybrid",
  DENSE: "dense",
  LEXICAL: "lexical",
} as const;

export type ObservatorySearchMode =
  (typeof OBSERVATORY_SEARCH_MODE)[keyof typeof OBSERVATORY_SEARCH_MODE];

export const OBSERVATORY_SEARCH_DEFAULT_LIMIT = 10;
export const OBSERVATORY_SEARCH_MAX_LIMIT = 50;
export const OBSERVATORY_LIST_DEFAULT_PAGE_SIZE = 50;
export const OBSERVATORY_LIST_MAX_PAGE_SIZE = 200;
export const OBSERVATORY_REQUEUE_MAX_IDS = 500;

// ---------------------------------------------------------------------------
// Info: (20261015 - Luphia) 發布到企業觀測站頁面（`Report` 表）
// ---------------------------------------------------------------------------

/**
 * Info: (20261015 - Luphia) 觀測站文件在 `Report.pdfPath` 上的前綴。
 * 完整鍵為 `observatory/{stockId}/{year}/{source}`：與文件的唯一鍵一一對應，
 * 發布可以 upsert（冪等），向量檢索的結果也能直接由欄位組回這個鍵、找到對應的 Report。
 */
export const OBSERVATORY_REPORT_PATH_PREFIX = "observatory";

// Info: (20261015 - Luphia) 報告標題的類型字樣；「永續報告書」「財務報告」同時是企業觀測站問題分類的關鍵字
// Info: (20261022 - Luphia) 公司登記的報告標題：現況快照，不帶年份；更新時間另由 downloadedAt 標示
export const OBSERVATORY_REGISTRATION_TITLE = "最新公司登記資料";

export const OBSERVATORY_REPORT_TITLE_SUFFIX: Record<
  ObservatorySource,
  string
> = {
  GCIS_REGISTRATION: "年公司登記資料",
  MOPS_FINANCIAL_REPORT: "年度財務報告",
  MOPS_FINANCIAL_REPORT_Q1: "年第一季財務報告",
  MOPS_FINANCIAL_REPORT_Q2: "年第二季財務報告",
  MOPS_FINANCIAL_REPORT_Q3: "年第三季財務報告",
  ESG_REPORT: "年永續報告書",
  GHG_INVENTORY: "年溫室氣體盤查揭露",
};

// Info: (20261015 - Luphia) 企業觀測站問題分類（QUERY_KEYWORDS 的鍵）→ 要檢索的來源
export const OBSERVATORY_SOURCES_BY_REPORT_TYPE: Record<
  string,
  readonly ObservatorySource[]
> = {
  永續報告書: [OBSERVATORY_SOURCE.ESG_REPORT, OBSERVATORY_SOURCE.GHG_INVENTORY],
  財務報告: [
    OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT,
    OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT_Q1,
    OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT_Q2,
    OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT_Q3,
    OBSERVATORY_SOURCE.GCIS_REGISTRATION,
  ],
};

// Info: (20261015 - Luphia) `Company.metadata`（證交所／櫃買中心原始資料）裡實收資本額的欄位名
export const COMPANY_PAID_IN_CAPITAL_KEYS = [
  "實收資本額",
  "Paidin.Capital.NTDollars",
] as const;

// Info: (20261015 - Luphia) MOPS 電子書查詢頁上「會計期間：曆年制」的字樣
export const MOPS_CALENDAR_YEAR_MARKER = "曆年制";

/**
 * Info: (20261015 - Luphia) 證交所／櫃買中心的產業別代碼 → 名稱（`Company.industry` 存的是代碼）。
 */
export const TWSE_INDUSTRY_NAME: Record<string, string> = {
  "01": "水泥工業",
  "02": "食品工業",
  "03": "塑膠工業",
  "04": "紡織纖維",
  "05": "電機機械",
  "06": "電器電纜",
  "07": "化學生技醫療",
  "08": "玻璃陶瓷",
  "09": "造紙工業",
  "10": "鋼鐵工業",
  "11": "橡膠工業",
  "12": "汽車工業",
  "13": "電子工業",
  "14": "建材營造業",
  "15": "航運業",
  "16": "觀光餐旅",
  "17": "金融保險業",
  "18": "貿易百貨業",
  "19": "綜合",
  "20": "其他業",
  "21": "化學工業",
  "22": "生技醫療業",
  "23": "油電燃氣業",
  "24": "半導體業",
  "25": "電腦及週邊設備業",
  "26": "光電業",
  "27": "通信網路業",
  "28": "電子零組件業",
  "29": "電子通路業",
  "30": "資訊服務業",
  "31": "其他電子業",
  "32": "文化創意業",
  "33": "農業科技業",
  "34": "電子商務",
  "35": "綠能環保",
  "36": "數位雲端",
  "37": "運動休閒",
  "38": "居家生活",
  "80": "管理股票",
  "91": "存託憑證",
};

// Info: (20261015 - Luphia) 記在 lastError 的固定原因碼（不是給人看的句子）
export const OBSERVATORY_REASON = {
  MISSING_TAX_ID: "missing_tax_id",
  NO_RECORD: "no_record",
  NO_FILE: "no_file",
  NO_GHG_ITEMS: "no_ghg_items",
  NO_TEXT_LAYER: "no_text_layer",
  UNSUPPORTED_MARKET: "unsupported_market",
} as const;
