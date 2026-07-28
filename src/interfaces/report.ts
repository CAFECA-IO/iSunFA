import { ReportType } from "@/constants/financial_report";
import { IBalanceSheet } from "@/interfaces/balance_sheet";
import { IIncomeStatement } from "@/interfaces/income_statement";
import { ICashFlowStatement } from "@/interfaces/cash_flow_statement";
import { IEsgReport } from "@/interfaces/esg_report";
import { ITrialBalance } from "@/interfaces/trial_balance";

/**
 * Info: (20260728 - Julian) 報表 API 未核對項目（供 UI 提示異常）。
 */
export interface IReportUnverifiedItem {
  id: string;
  note: string;
  type: string;
}

/**
 * Info: (20260728 - Julian) 各報表結果共同欄位（未核對彙整）。
 */
interface IReportResultBase {
  unverifiedCount: number;
  unverifiedItems: IReportUnverifiedItem[];
}

/**
 * Info: (20260728 - Julian)
 * 報表 API 結果（ReportService.getReport 回傳）。
 * 以 reportType 為判別的可判別聯集，讓消費端可依 reportType 窄化取得對應報表型別，守住型別安全。
 */
export type IReportResult =
  | (IReportResultBase & {
      reportType: ReportType.BALANCE_SHEET;
      report: IBalanceSheet;
    })
  | (IReportResultBase & {
      reportType: ReportType.INCOME_STATEMENT;
      report: IIncomeStatement;
    })
  | (IReportResultBase & {
      reportType: ReportType.CASH_FLOW;
      report: ICashFlowStatement;
    })
  | (IReportResultBase & {
      reportType: ReportType.TRIAL_BALANCE;
      report: ITrialBalance;
    })
  | (IReportResultBase & {
      reportType: ReportType.ESG_REPORT;
      report: IEsgReport;
    });
