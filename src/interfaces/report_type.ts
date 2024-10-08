// ToDo: (20240802 - Julian) [Beta] change in equity statement is not released yet
export enum FinancialReportTypesKey {
  balance_sheet = 'balance_sheet',
  comprehensive_income_statement = 'comprehensive_income_statement',
  cash_flow_statement = 'cash_flow_statement',
  // Info: (20240814 - Anna) 增加401報表
  report_401 = 'report_401',
  //  change_in_equity_statement = 'change_in_equity_statement'
}

export enum FinancialReportTypeName {
  balance_sheet = 'Balance Sheet',
  comprehensive_income_statement = 'Comprehensive Income Statement',
  cash_flow_statement = 'Cash Flow Statement',
  report_401 = 'Report 401',
  //  change_in_equity_statement = 'change_in_equity_statement'
}

export enum AnalysisReportTypesKey {
  financial_performance = 'financial_performance',
  cost_analysis = 'cost_analysis',
  hr_utilization = 'hr_utilization',
  forecast_report = 'forecast_report',
}

export enum AllReportTypesKey {
  all = 'All',
}

export enum ReportTypeToBaifaReportType {
  balance_sheet = 'balance',
  comprehensive_income_statement = 'comprehensive-income',
  cash_flow_statement = 'cash-flow',
  report_401 = 'report-401',
  //  change_in_equity_statement = 'change-in-equity'
}

export enum BaifaReportTypeToReportType {
  balance = 'balance_sheet',
  'comprehensive-income' = 'comprehensive_income_statement',
  'cash-flow' = 'cash_flow_statement',
  'report-401' = 'report_401',
  //  'change-in-equity' = 'change_in_equity_statement'
}

export const FinancialReportTypesMap: Record<
  FinancialReportTypesKey,
  { id: FinancialReportTypesKey; name: string }
> = {
  [FinancialReportTypesKey.balance_sheet]: {
    id: FinancialReportTypesKey.balance_sheet,
    name: 'Balance Sheet',
  },
  [FinancialReportTypesKey.comprehensive_income_statement]: {
    id: FinancialReportTypesKey.comprehensive_income_statement,
    name: 'Comprehensive Income Statement',
  },
  [FinancialReportTypesKey.cash_flow_statement]: {
    id: FinancialReportTypesKey.cash_flow_statement,
    name: 'Cash Flow Statement',
  },
  // Info: (20240814 - Anna) 增加401報表
  [FinancialReportTypesKey.report_401]: {
    id: FinancialReportTypesKey.report_401,
    name: 'report_401',
  },
  // [FinancialReportTypesKey.change_in_equity_statement]: {
  //   id: FinancialReportTypesKey.change_in_equity_statement,
  //   name: 'Change in Equity Statement',
  // }
};

export const AllFinancialReportTypesMap: Record<
  FinancialReportTypesKey & AllReportTypesKey,
  { id: FinancialReportTypesKey | AllReportTypesKey; name: string }
> = {
  [FinancialReportTypesKey.balance_sheet]: {
    id: FinancialReportTypesKey.balance_sheet,
    name: 'Balance Sheet',
  },
  [FinancialReportTypesKey.comprehensive_income_statement]: {
    id: FinancialReportTypesKey.comprehensive_income_statement,
    name: 'Comprehensive Income Statement',
  },
  [FinancialReportTypesKey.cash_flow_statement]: {
    id: FinancialReportTypesKey.cash_flow_statement,
    name: 'Cash Flow Statement',
  },
  [AllReportTypesKey.all]: {
    id: AllReportTypesKey.all,
    name: 'All',
  },
};

export const AnalysisReportTypesMap: Record<
  AnalysisReportTypesKey,
  { id: AnalysisReportTypesKey; name: string }
> = {
  [AnalysisReportTypesKey.financial_performance]: {
    id: AnalysisReportTypesKey.financial_performance,
    name: 'Financial Performance',
  },
  [AnalysisReportTypesKey.cost_analysis]: {
    id: AnalysisReportTypesKey.cost_analysis,
    name: 'Cost Analysis',
  },
  [AnalysisReportTypesKey.hr_utilization]: {
    id: AnalysisReportTypesKey.hr_utilization,
    name: 'HR Utilization',
  },
  [AnalysisReportTypesKey.forecast_report]: {
    id: AnalysisReportTypesKey.forecast_report,
    name: 'Forecast Report',
  },
};

export const AllReportTypesOptions: Record<
  FinancialReportTypesKey & AnalysisReportTypesKey & AllReportTypesKey,
  string
> = {
  [AllReportTypesKey.all]: 'All',
  [FinancialReportTypesKey.balance_sheet]: 'Balance Sheet',
  [FinancialReportTypesKey.comprehensive_income_statement]: 'Comprehensive Income Statement',
  [FinancialReportTypesKey.cash_flow_statement]: 'Cash Flow Statement',
  [AnalysisReportTypesKey.financial_performance]: 'Financial Performance',
  [AnalysisReportTypesKey.cost_analysis]: 'Cost Analysis',
  [AnalysisReportTypesKey.hr_utilization]: 'HR Utilization',
  [AnalysisReportTypesKey.forecast_report]: 'Forecast Report',
};
