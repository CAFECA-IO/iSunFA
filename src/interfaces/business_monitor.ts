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
  company: string;
  title: string;
  reportYear: string;
  period: string;
  industry: string;
  capital: string;
  verificationAgency: string;
  verificationStandards: string;
  assuranceAgency: string;
  assuranceStandards: string;
}

export const mockReports: IMockReport[] = [
  {
    id: 1,
    company: "環拓科技股份有限公司",
    title: "2024 年永續報告書",
    reportYear: "2024",
    period: "2024/01/31 ~ 2024/12/31",
    industry: "綠能環保",
    capital: "無",
    verificationAgency: "無",
    verificationStandards: "參考國際永續標準、準則與規範(GRI、TCFD、SASB)",
    assuranceAgency: "無",
    assuranceStandards: "無",
  },
  {
    id: 2,
    company: "鴻海精密工業股份有限公司",
    title: "2024 年永續報告書",
    reportYear: "2024",
    period: "2024/01/01 ~ 2024/12/31",
    industry: "其他電子業",
    capital: "100億以上",
    verificationAgency: "台灣檢驗科技股份有限公司(SGS)",
    verificationStandards: "參考國際永續標準、準則與規範(GRI、SASB)",
    assuranceAgency: "資誠聯合會計師事務所",
    assuranceStandards: "確信準則 3000 號",
  },
  {
    id: 3,
    company: "友達光電股份有限公司",
    title: "2024 年永續報告書",
    reportYear: "2024",
    period: "2024/01/01 ~ 2024/12/31",
    industry: "光電業",
    capital: "100億以上",
    verificationAgency: "台灣檢驗科技股份有限公司(SGS)",
    verificationStandards: "參考國際永續標準、準則與規範(GRI、SASB)",
    assuranceAgency: "資誠聯合會計師事務所",
    assuranceStandards: "確信準則 3000 號",
  },
  {
    id: 4,
    company: "聯電股份有限公司",
    title: "2024 年永續報告書",
    reportYear: "2024",
    period: "2024/01/01 ~ 2024/12/31",
    industry: "半導體業",
    capital: "100億以上",
    verificationAgency: "台灣檢驗科技股份有限公司(SGS)",
    verificationStandards: "參考國際永續標準、準則與規範(GRI、SASB)",
    assuranceAgency: "資誠聯合會計師事務所",
    assuranceStandards: "確信準則 3000 號",
  },
  {
    id: 5,
    company: "台灣積體電路製造股份有限公司",
    title: "2024 年永續報告書",
    reportYear: "2024",
    period: "2024/01/01 ~ 2024/12/31",
    industry: "半導體業",
    capital: "100億以上",
    verificationAgency: "台灣檢驗科技股份有限公司(SGS)",
    verificationStandards: "參考國際永續標準、準則與規範(GRI、SASB)",
    assuranceAgency: "資誠聯合會計師事務所",
    assuranceStandards: "確信準則 3000 號",
  },
];
