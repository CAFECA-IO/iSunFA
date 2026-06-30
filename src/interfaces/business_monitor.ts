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
  sourceReportIds: number[];
}

export interface IMockReport {
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
  report: IMockReport;
  companyReports: IMockReport[];
  industryReports: IMockReport[];
}
