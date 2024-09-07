// ToDo: (20240802 - Julian) [Beta] change in equity statement is not released yet
import { AccountType } from '@/constants/account';
import { FinancialReportTypesKey } from '@/interfaces/report_type';

export enum ReportType {
  FINANCIAL = 'financial',
  ANALYSIS = 'analysis',
}

export enum ReportSheetType {
  BALANCE_SHEET = 'balance_sheet',
  INCOME_STATEMENT = 'comprehensive_income_statement',
  CASH_FLOW_STATEMENT = 'cash_flow_statement',
  REPORT_401 = 'report_401',
  // Info: (20240802 - Julian)
  //  CHANGE_IN_EQUITY_STATEMENT = 'changeInEquityStatement',
}

export enum ReportSheetTypeDisplay {
  BALANCE_SHEET = 'Balance Sheet',
  INCOME_STATEMENT = 'Statement of Comprehensive Income',
  CASH_FLOW_STATEMENT = 'Statement of Cash Flows',
  REPORT_401 = 'Report 401',
  // Info: (20240802 - Julian)
  //  CHANGE_IN_EQUITY_STATEMENT = 'Statement of Changes in Equity',
}

export enum ReportStatusType {
  PENDING = 'pending',
  GENERATED = 'generated',
}

export const ReportUrlMap: {
  [key in ReportSheetType]: string;
} = {
  [ReportSheetType.BALANCE_SHEET]: 'balance_sheet',
  [ReportSheetType.INCOME_STATEMENT]: 'income_statement',
  [ReportSheetType.CASH_FLOW_STATEMENT]: 'cash_flow_statement',
  [ReportSheetType.REPORT_401]: '401-report',
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
  [ReportSheetType.REPORT_401]: [],
};

export const ReportSheetTypeDisplayMap: {
  [key in ReportSheetType]: string;
} = {
  [ReportSheetType.BALANCE_SHEET]: ReportSheetTypeDisplay.BALANCE_SHEET,
  [ReportSheetType.INCOME_STATEMENT]: ReportSheetTypeDisplay.INCOME_STATEMENT,
  [ReportSheetType.CASH_FLOW_STATEMENT]: ReportSheetTypeDisplay.CASH_FLOW_STATEMENT,
  [ReportSheetType.REPORT_401]: ReportSheetTypeDisplay.REPORT_401,
};

export const FinancialReportTypesKeyReportSheetTypeMapping: {
  [key in FinancialReportTypesKey]: ReportSheetType;
} = {
  [FinancialReportTypesKey.balance_sheet]: ReportSheetType.BALANCE_SHEET,
  [FinancialReportTypesKey.comprehensive_income_statement]: ReportSheetType.INCOME_STATEMENT,
  [FinancialReportTypesKey.cash_flow_statement]: ReportSheetType.CASH_FLOW_STATEMENT,
  // Info: (20240814 - Anna) 增加401報表
  [FinancialReportTypesKey.report_401]: ReportSheetType.REPORT_401,
  // Info: (20240802 - Julian)
  //  [FinancialReportTypesKey.change_in_equity_statement]: ReportSheetType.CHANGE_IN_EQUITY_STATEMENT,
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
  // Info: (20240802 - Julian)
  //  [AccountType.CHANGE_IN_EQUITY]: ReportSheetType.CHANGE_IN_EQUITY_STATEMENT,
  [AccountType.OTHER]: ReportSheetType.BALANCE_SHEET,
};
