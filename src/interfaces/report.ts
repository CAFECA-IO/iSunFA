import { ReportSheetType, ReportType } from '@/constants/report';
import { IAccountForSheetDisplay, IAccountResultStatus } from '@/interfaces/accounting_account';
import { ReportLanguagesKey } from '@/interfaces/report_language';
import { AnalysisReportTypesKey, FinancialReportTypesKey } from '@/interfaces/report_type';

export interface IAnalysisReportRequest {
  project_id: string;
  type: string;
  language: string;
  start_date: Date;
  end_date: Date;
}

export interface IReport {
  id: number;
  companyId: number;
  tokenContract: string;
  tokenId: string;
  name: string;
  from: number;
  to: number;
  type: ReportType;
  reportType: ReportSheetType;
  status: string;
  remainingSeconds: number;
  paused: boolean;
  projectId: number | null;
  reportLink: string;
  downloadLink: string;
  blockChainExplorerLink: string;
  evidenceId: string;
  content: IAccountForSheetDisplay[];
  createdAt: number;
  updatedAt: number;
}
export interface IReportOld {
  reportTypesName: {
    id: FinancialReportTypesKey | AnalysisReportTypesKey;
    name: string;
  };
  tokenContract: string;
  tokenId: string;
  reportLink: string;
}

export type IAnalysisReport = string | null;

export type IFinancialReport = string | null;

export type FinancialReportType =
  (typeof FinancialReportTypesKey)[keyof typeof FinancialReportTypesKey];
export type AnalysisReportType =
  (typeof AnalysisReportTypesKey)[keyof typeof AnalysisReportTypesKey];

export type FinancialReportLanguage = (typeof ReportLanguagesKey)[keyof typeof ReportLanguagesKey];

export interface IFinancialReportRequest {
  project_id: string;
  type: FinancialReportType;
  language: FinancialReportLanguage;
  start_date: Date;
  end_date: Date;
}

export function isFinancialReportType(data: string): data is FinancialReportType {
  return (
    data === FinancialReportTypesKey.balance_sheet ||
    data === FinancialReportTypesKey.comprehensive_income_statement ||
    data === FinancialReportTypesKey.cash_flow_statement
  );
}

export interface IFinancialReportsProgressStatusResponse extends IAccountResultStatus {
  type: FinancialReportType;
  startDate: Date;
  endDate: Date;
}

// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isIAnalysisReportRequest(obj: any): obj is IAnalysisReportRequest {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.type === 'string' &&
    typeof obj.language === 'string' &&
    obj.start_date instanceof Date &&
    obj.end_date instanceof Date
  );
}
