export interface IAnalysisReportRequest {
  type: string;
  language: string;
  start_date: Date;
  end_date: Date;
}

export type IAnalysisReport = string | null;

export type IFinancialReport = string | null;

export interface IFinancialReportRequest {
  type: string;
  language: string;
  start_date: Date;
  end_date: Date;
}
