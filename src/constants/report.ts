import { AccountType } from "@/constants/account";

export enum ReportType {
    FINANCIAL = 'financial',
    ANALYSIS = 'analysis',
}

export enum ReportSheetType {
  BALANCE_SHEET = 'balanceSheet',
  INCOME_STATEMENT = 'incomeStatement',
  CASH_FLOW_STATEMENT = 'cashFlowStatement',
  CHANGE_IN_EQUITY_STATEMENT = 'changeInEquityStatement',
}

export enum ReportSheetTypeDisplay {
  BALANCE_SHEET = 'Statement of Financial Position',
  INCOME_STATEMENT = 'Statement of Comprehensive Income',
  CASH_FLOW_STATEMENT = 'Statement of Cash Flows',
  CHANGE_IN_EQUITY_STATEMENT = 'Statement of Changes in Equity',
}

export const ReportSheetAccountTypeMap: {
  [key in ReportSheetType]: AccountType[];
} = {
  [ReportSheetType.BALANCE_SHEET]: [
    AccountType.ASSET,
    AccountType.LIABILITY,
    AccountType.EQUITY,
  ],
  [ReportSheetType.INCOME_STATEMENT]: [
    AccountType.REVENUE,
    AccountType.COST,
    AccountType.INCOME,
    AccountType.EXPENSE,
    AccountType.GAIN_OR_LOSS,
    AccountType.OTHER_COMPREHENSIVE_INCOME,
  ],
  [ReportSheetType.CASH_FLOW_STATEMENT]: [AccountType.CASH_FLOW],
  [ReportSheetType.CHANGE_IN_EQUITY_STATEMENT]: [AccountType.CHANGE_IN_EQUITY],
};

export const ReportSheetTypeDisplayMap: {
    [key in ReportSheetType]: string
} = {
  [ReportSheetType.BALANCE_SHEET]: ReportSheetTypeDisplay.BALANCE_SHEET,
  [ReportSheetType.INCOME_STATEMENT]: ReportSheetTypeDisplay.INCOME_STATEMENT,
  [ReportSheetType.CASH_FLOW_STATEMENT]: ReportSheetTypeDisplay.CASH_FLOW_STATEMENT,
  [ReportSheetType.CHANGE_IN_EQUITY_STATEMENT]: ReportSheetTypeDisplay.CHANGE_IN_EQUITY_STATEMENT,
};
