import { AccountType } from '@/constants/account';
import { FinancialReportTypesKey } from '@/interfaces/report_type';

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
  BALANCE_SHEET = 'Balance Sheet',
  INCOME_STATEMENT = 'Statement of Comprehensive Income',
  CASH_FLOW_STATEMENT = 'Statement of Cash Flows',
  CHANGE_IN_EQUITY_STATEMENT = 'Statement of Changes in Equity',
}

export enum ReportStatusType {
  PENDING = 'pending',
  GENERATED = 'generated',
}

export const ReportUrlMap: {
  [key in ReportSheetType]: string;
} = {
  [ReportSheetType.BALANCE_SHEET]: 'balance-sheet',
  [ReportSheetType.INCOME_STATEMENT]: 'income-statement',
  [ReportSheetType.CASH_FLOW_STATEMENT]: 'cash-flow-statement',
  [ReportSheetType.CHANGE_IN_EQUITY_STATEMENT]: 'change-in-equity-statement',
};

export const ReportSheetAccountTypeMap: {
  [key in ReportSheetType]: AccountType[];
} = {
  [ReportSheetType.BALANCE_SHEET]: [
    AccountType.EQUITY,
    AccountType.ASSET,
    AccountType.LIABILITY,
    AccountType.OTHER,
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
  [key in ReportSheetType]: string;
} = {
  [ReportSheetType.BALANCE_SHEET]: ReportSheetTypeDisplay.BALANCE_SHEET,
  [ReportSheetType.INCOME_STATEMENT]: ReportSheetTypeDisplay.INCOME_STATEMENT,
  [ReportSheetType.CASH_FLOW_STATEMENT]: ReportSheetTypeDisplay.CASH_FLOW_STATEMENT,
  [ReportSheetType.CHANGE_IN_EQUITY_STATEMENT]: ReportSheetTypeDisplay.CHANGE_IN_EQUITY_STATEMENT,
};

export const ReportSheetTypeFinancialFinancialReportTypesKeyMapping: {
  [key in ReportSheetType]: FinancialReportTypesKey;
} = {
  [ReportSheetType.BALANCE_SHEET]: FinancialReportTypesKey.balance_sheet,
  [ReportSheetType.INCOME_STATEMENT]: FinancialReportTypesKey.comprehensive_income_statement,
  [ReportSheetType.CASH_FLOW_STATEMENT]: FinancialReportTypesKey.cash_flow_statement,
  [ReportSheetType.CHANGE_IN_EQUITY_STATEMENT]: FinancialReportTypesKey.change_in_equity_statement,
};
export const FinancialReportTypesKeyReportSheetTypeMapping: {
  [key in FinancialReportTypesKey]: ReportSheetType;
} = {
  [FinancialReportTypesKey.balance_sheet]: ReportSheetType.BALANCE_SHEET,
  [FinancialReportTypesKey.comprehensive_income_statement]: ReportSheetType.INCOME_STATEMENT,
  [FinancialReportTypesKey.cash_flow_statement]: ReportSheetType.CASH_FLOW_STATEMENT,
  [FinancialReportTypesKey.change_in_equity_statement]: ReportSheetType.CHANGE_IN_EQUITY_STATEMENT,
};

export const ACCOUNT_TYPE_REPORT_SHEET_TYPE_MAPPING: {
  [key in AccountType]: ReportSheetType;
} = {
  [AccountType.ASSET]: ReportSheetType.BALANCE_SHEET,
  [AccountType.LIABILITY]: ReportSheetType.BALANCE_SHEET,
  [AccountType.EQUITY]: ReportSheetType.BALANCE_SHEET,
  [AccountType.REVENUE]: ReportSheetType.INCOME_STATEMENT,
  [AccountType.COST]: ReportSheetType.INCOME_STATEMENT,
  [AccountType.INCOME]: ReportSheetType.INCOME_STATEMENT,
  [AccountType.EXPENSE]: ReportSheetType.INCOME_STATEMENT,
  [AccountType.GAIN_OR_LOSS]: ReportSheetType.INCOME_STATEMENT,
  [AccountType.OTHER_COMPREHENSIVE_INCOME]: ReportSheetType.INCOME_STATEMENT,
  [AccountType.CASH_FLOW]: ReportSheetType.CASH_FLOW_STATEMENT,
  [AccountType.CHANGE_IN_EQUITY]: ReportSheetType.CHANGE_IN_EQUITY_STATEMENT,
  [AccountType.OTHER]: ReportSheetType.BALANCE_SHEET,
};
