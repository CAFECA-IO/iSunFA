import {
  BusinessMonitorDocumentStatus,
  BusinessMonitorFileContentType,
} from "@/constants/business_monitor";

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
}

/**
 * Info: (20261022 - Luphia) AI 諮詢實際查詢的範疇，隨回答回傳給前端顯示：
 * 使用者看得到「這題查了哪幾家公司、哪幾個年度」，答非所問時知道是範疇不對。
 */
export interface IAIChatScope {
  companies: string[];
  years: string[];
}
