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
