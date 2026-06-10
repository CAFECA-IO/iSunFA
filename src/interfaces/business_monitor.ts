import { BUSINESS_MONITOR_INDUSTRIES } from "@/constants/business_monitor";

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
  company: string; // Info: (20260610 - Julian) 企業名稱
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
    isVerifiedByThirdParty: false,
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
    isVerifiedByThirdParty: true,
  },
  {
    id: 3,
    company: "友達光電股份有限公司",
    title: "2024 年永續報告書",
    reportYear: "2024",
    period: "2024/01/01 ~ 2024/12/31",
    industry: BUSINESS_MONITOR_INDUSTRIES.OPTOELECTRONICS,
    capital: "100億以上",
    verificationAgency: "台灣檢驗科技股份有限公司(SGS)",
    verificationStandards: "參考國際永續標準、準則與規範(GRI、SASB)",
    assuranceAgency: "資誠聯合會計師事務所",
    assuranceStandards: "確信準則 3000 號",
    isVerifiedByThirdParty: true,
  },
  {
    id: 4,
    company: "聯電股份有限公司",
    title: "2024 年永續報告書",
    reportYear: "2024",
    period: "2024/01/01 ~ 2024/12/31",
    industry: BUSINESS_MONITOR_INDUSTRIES.SEMICONDUCTOR,
    capital: "100億以上",
    verificationAgency: "台灣檢驗科技股份有限公司(SGS)",
    verificationStandards: "參考國際永續標準、準則與規範(GRI、SASB)",
    assuranceAgency: "資誠聯合會計師事務所",
    assuranceStandards: "確信準則 3000 號",
    isVerifiedByThirdParty: true,
  },
  {
    id: 5,
    company: "台灣積體電路製造股份有限公司",
    title: "2024 年永續報告書",
    reportYear: "2024",
    period: "2024/01/01 ~ 2024/12/31",
    industry: BUSINESS_MONITOR_INDUSTRIES.SEMICONDUCTOR,
    capital: "100億以上",
    verificationAgency: "台灣檢驗科技股份有限公司(SGS)",
    verificationStandards: "參考國際永續標準、準則與規範(GRI、SASB)",
    assuranceAgency: "資誠聯合會計師事務所",
    assuranceStandards: "確信準則 3000 號",
    isVerifiedByThirdParty: true,
  },
  {
    id: 6,
    company: "環拓科技股份有限公司",
    title: "2023 年永續報告書",
    reportYear: "2023",
    period: "2023/01/31 ~ 2023/12/31",
    industry: "綠能環保",
    capital: "無",
    verificationAgency: "台灣檢驗科技股份有限公司(SGS)",
    verificationStandards: "參考國際永續標準、準則與規範(GRI、TCFD、SASB)",
    assuranceAgency: "無",
    assuranceStandards: "無",
    isVerifiedByThirdParty: true,
  },
  {
    id: 7,
    company: "環拓科技股份有限公司",
    title: "2022 年永續報告書",
    reportYear: "2022",
    period: "2022/01/31 ~ 2022/12/31",
    industry: "綠能環保",
    capital: "無",
    verificationAgency: "台灣檢驗科技股份有限公司(SGS)",
    verificationStandards: "參考國際永續標準、準則與規範(GRI、TCFD、SASB)",
    assuranceAgency: "無",
    assuranceStandards: "無",
    isVerifiedByThirdParty: true,
  },
];
