import {
  BusinessMonitorDocumentStatus,
  BusinessMonitorFileContentType,
  EmissionScope,
} from "@/constants/business_monitor";
import {
  FinancialKeyItem,
  FinancialRatio,
} from "@/constants/company_financial";

export type DownloadStatus = "idle" | "downloading" | "completed" | "error";

export interface IReportDownloadTask {
  reportId: string | number;
  companyName: string;
  reportTitle: string;
  fileSizeBytes: number;
  downloadedBytes: number;
  progress: number;
  status: DownloadStatus;
  estimatedTimeRemaining?: number;
}

export interface IAIResponse {
  answer: string;
  // Info: (20261022 - Luphia) 取代原本只有報告 id 的 sourceReportIds：出處要能點回頁碼與官方來源
  citations: IAICitation[];
}

export interface IReport {
  id: number;
  companyName: string; // Info: (20260610 - Julian) 企業名稱
  title: string; // Info: (20260610 - Julian) 報告標題
  reportYear: string; // Info: (20260610 - Julian) 報告年度
  period: string; // Info: (20260610 - Julian) 揭露期間
  industry: string; // Info: (20260610 - Julian) 產業別
  capital: string; // Info: (20260610 - Julian) 資本額
  verificationAgency: string; // Info: (20260610 - Julian) 查證機構
  verificationStandards: string; // Info: (20260610 - Julian) 查證採用標準
  assuranceAgency: string; // Info: (20260610 - Julian) 確信機構
  assuranceStandards: string; // Info: (20260610 - Julian) 確信採用標準
  isVerifiedByThirdParty: boolean; // Info: (20260610 - Julian) 是否經第三方確信
}

export interface IReportDetailPayload {
  report: IReport;
  companyReports: IReport[];
  industryReports: IReport[];
}

/**
 * Info: (20261022 - Luphia) AI 回答的一筆出處：本輪檢索到、送進提示詞的證據片段。
 * `index` 就是回答裡 [n] 的 n；`cited` 為 true 代表回答確實引用了它。
 * 頁碼與官方網址來源沒有提供時為 null（零捏造：不補值）。
 */
export interface IAICitation {
  index: number;
  reportId: number;
  companyName: string;
  title: string;
  reportYear: string;
  pageNumber: number | null;
  sourceUrl: string | null;
  cited: boolean;
}

// Info: (20261022 - Luphia) 原始檔下載：service 交給 route 的檔案內容與標頭資訊
export interface IReportFile {
  body: Buffer;
  contentType: BusinessMonitorFileContentType;
  fileName: string;
}

// =========================================================================
// Info: (20261022 - Luphia) 以公司為中心的首頁與公司頁
// =========================================================================

// Info: (20261022 - Luphia) 依產業瀏覽：證交所產業代碼、名稱、追蹤中的公司數
export interface IBusinessMonitorIndustry {
  code: string;
  name: string;
  companyCount: number;
}

export interface IBusinessMonitorCompany {
  stockId: string;
  name: string;
  abbreviation: string | null;
  industryCode: string | null;
  industryName: string;
  // Info: (20261022 - Luphia) 市場別原樣（"sii" 上市、"otc" 上櫃），前端查表翻譯
  marketType: string;
  // Info: (20261022 - Luphia) 已可下載的觀測站文件數；0 代表還沒有任何報告
  documentCount: number;
}

export interface IBusinessMonitorCompanyList {
  companies: IBusinessMonitorCompany[];
  total: number;
  totalPages: number;
}

export interface ICompanyRegistrationField {
  label: string;
  value: string;
}

export interface ICompanyRegistrationDirector {
  position: string;
  name: string;
  representing: string;
  shares: string;
}

/**
 * Info: (20261022 - Luphia) 公司登記是「現況快照」，不屬於任何資料年度：
 * 以最後一次向商業司取得的時間標示（`updatedAt`），不再掛「2026 年」這種抓取年份。
 */
export interface ICompanyRegistration {
  updatedAt: string;
  reportId: number | null;
  fields: ICompanyRegistrationField[];
  directors: ICompanyRegistrationDirector[];
}

// Info: (20261022 - Luphia) 報告庫的一份文件；year 是資料所屬年度（會計／揭露年度）
export interface ICompanyLibraryDocument {
  source: string;
  title: string;
  year: number;
  status: BusinessMonitorDocumentStatus;
  // Info: (20261022 - Luphia) 已發布成 Report 才有 id，才能下載與被 AI 引用
  reportId: number | null;
  period: string;
  sourceUrl: string | null;
  // Info: (20261022 - Luphia) 本系統最後一次向來源取得的時間；不是來源的公布日
  retrievedAt: string | null;
}

export interface ICompanyLibraryYear {
  year: number;
  documents: ICompanyLibraryDocument[];
}

export interface IBusinessMonitorCompanyProfile {
  company: IBusinessMonitorCompany & {
    taxId: string | null;
    listingDate: string | null;
  };
  registration: ICompanyRegistration | null;
  library: ICompanyLibraryYear[];
  // Info: (20261023 - Luphia) 新的在前；OpenAPI 只給最新一期，歷史由每日同步累積
  financials: IFinancialPeriod[];
  // Info: (20261023 - Luphia) 依揭露年度，新的在前
  emissions: IEmissionYear[];
}

/**
 * Info: (20261022 - Luphia) AI 諮詢實際查詢的範疇，隨回答回傳給前端顯示：
 * 使用者看得到「這題查了哪幾家公司、哪幾個年度」，答非所問時知道是範疇不對。
 */
export interface IAIChatScope {
  companies: string[];
  years: string[];
}

// =========================================================================
// Info: (20261023 - Luphia) 公司頁的財務數字與碳排
// =========================================================================

// Info: (20261023 - Luphia) 一個關鍵科目：label 是來源原本的科目名稱，value 是十進位字串（不經過 number）
export interface IFinancialKeyValue {
  key: FinancialKeyItem;
  label: string;
  value: string;
  unit: string;
  /**
   * Info: (20261023 - Luphia) 與去年同期（同一季、年初累計）相比的增減百分比；
   * 去年同期沒有這個科目、或去年同期的值不是正數時為 null（由負轉正的「百分比」沒有意義）。
   */
  changePercent: string | null;
}

// Info: (20261023 - Luphia) 由 Decimal 算出的比率（百分比，小數第 2 位）；分母為 0 或缺科目時不給
export interface IFinancialRatioValue {
  key: FinancialRatio;
  value: string;
}

export interface IFinancialPeriod {
  year: number;
  // Info: (20261023 - Luphia) 損益表數字是年初累計至這一季
  quarter: number;
  // Info: (20261023 - Luphia) 來源的出表日期原樣（民國 yyyMMdd）
  reportedAt: string;
  items: IFinancialKeyValue[];
  ratios: IFinancialRatioValue[];
}

export interface IEmissionScope {
  // Info: (20261023 - Luphia) 來源揭露項目名稱原樣（例：直接(範疇一)溫室氣體排放量(公噸CO₂e)）
  label: string;
  scope: EmissionScope;
  value: string;
  boundary: string;
  assurer: string;
  standard: string;
  opinion: string;
  /**
   * Info: (20261023 - Luphia) 與前一個揭露年度同範疇相比的增減（百分比字串，小數第 2 位）。
   * 只在兩年的資料邊界文字完全相同時計算；邊界不同時為 null 並標示 boundaryChanged，
   * 免得把「範圍變大」說成「排放增加」。
   */
  changePercent: string | null;
  boundaryChanged: boolean;
}

export interface IEmissionYear {
  year: number;
  reportId: number | null;
  scopes: IEmissionScope[];
}
