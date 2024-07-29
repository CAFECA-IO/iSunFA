import { ReportSheetType, ReportType } from '@/constants/report';
import { IAccountReadyForFrontend, IAccountResultStatus } from '@/interfaces/accounting_account';
import { ReportLanguagesKey } from '@/interfaces/report_language';
import { AnalysisReportTypesKey, FinancialReportTypesKey } from '@/interfaces/report_type';
import { Prisma } from '@prisma/client';

export type IReportIncludeCompany = Prisma.ReportGetPayload<{
  include: {
    company: true;
  };
}>;
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
  content: IAccountReadyForFrontend[];
  createdAt: number;
  updatedAt: number;
}

export type IReportIncludeProject = Prisma.ReportGetPayload<{
  include: {
    project: true;
  };
}>;
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
  projectId?: string;
  reportType?: ReportSheetType;
  reportLanguage?: ReportLanguagesKey;
  startDate?: number;
  endDate?: number;
  financialOrAnalysis?: 'financial' | 'analysis';
}

export interface FinancialReportItem {
  code: string;
  name: string;
  curPeriodAmount: number;
  curPeriodAmountString: string;
  curPeriodPercentage: number;
  prePeriodAmount: number;
  prePeriodAmountString: string;
  prePeriodPercentage: number;
  indent: number;
}

// Info Murky (20240729): To Shirley, New Interface need to be connect to front end
export interface FinancialReport {
  company: {
    id: number;
    code: string;
    name: string;
  },
  preDate: {
    from: number;
    to: number;
  };
  curDate: {
    from: number;
    to: number;
  };
  reportType: ReportSheetType;
  general: FinancialReportItem[];
  details: FinancialReportItem[];
  otherInfo: unknown;
}

export interface BalanceSheetOtherInfo {
  dso: {
    curDso: number;
    preDso: number;
  };
  inventoryTurnoverDays: {
    curInventoryTurnoverDays: number;
    preInventoryTurnoverDays: number;
  };
}

export interface IncomeStatementOtherInfo {
  revenueAndExpenseRatio: {
    revenue: IAccountReadyForFrontend;
    totalCost: IAccountReadyForFrontend;
    salesExpense: IAccountReadyForFrontend;
    administrativeExpense: IAccountReadyForFrontend;
    ratio: {
      curRatio: number;
      preRatio: number;
    },
  },
  revenueToRD: {
    revenue: IAccountReadyForFrontend;
    researchAndDevelopmentExpense: IAccountReadyForFrontend;
    ratio: {
      curRatio: number;
      preRatio: number;
    },
  },
}

export interface CashFlowStatementOtherInfo {
  operatingStabilized: { [key: string]: {
    cur: number;
    curMinus1: number;
    curMinus2: number;
    curMinus3: number;
    curMinus4: number;
   } };
  strategyInvest:{
      cur: {
      PPEInvest: number;
      strategyInvest: number;
      otherInvest: number;
    };
    pre: {
      PPEInvest: number;
      strategyInvest: number;
      otherInvest: number;
    };
  }

}

// Todo Murky (20240729):
export interface BalanceSheetReport extends FinancialReport {
  otherInfo: BalanceSheetOtherInfo;
}

// Todo Murky (20240729):
export interface IncomeStatementReport extends FinancialReport {
  otherInfo: IncomeStatementOtherInfo;
}

// Todo Murky (2024729):
export interface CashFlowStatementReport extends FinancialReport {
  otherInfo: CashFlowStatementOtherInfo;
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
