export enum FinancialReportTypesKey {
  balance_sheet = 'balance_sheet',
  comprehensive_income_statement = 'comprehensive_income_statement',
  cash_flow_statement = 'cash_flow_statement',
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
}

export enum BaifaReportTypeToReportType {
  balance = 'balance_sheet',
  'comprehensive-income' = 'comprehensive_income_statement',
  'cash-flow' = 'cash_flow_statement',
}

// TODO: i18n (20240430 - Shirley)
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
