export enum ReportTypesKey {
  balance_sheet = 'balance_sheet',
  comprehensive_income_statement = 'comprehensive_income_statement',
  cash_flow_statement = 'cash_flow_statement',
}

// TODO: i18n (20240430 - Shirley)
export const ReportTypesMap: Record<ReportTypesKey, { id: ReportTypesKey; name: string }> = {
  balance_sheet: { id: ReportTypesKey.balance_sheet, name: 'Balance Sheet' },
  comprehensive_income_statement: {
    id: ReportTypesKey.comprehensive_income_statement,
    name: 'Comprehensive Income Statement',
  },
  cash_flow_statement: {
    id: ReportTypesKey.cash_flow_statement,
    name: 'Cash Flow Statement',
  },
};
