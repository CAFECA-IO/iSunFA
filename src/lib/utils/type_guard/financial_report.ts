import { IFinancialReportJSON, IFinancialStatements } from '@/interfaces/financial_report';
import { isIBalanceSheet } from '@/lib/utils/type_guard/balance_sheet';
import { isIComprehensiveIncome } from '@/lib/utils/type_guard/comprehensive_income';
import { isICashFlow } from '@/lib/utils/type_guard/cash_flow';
import { isStringNumberPair } from '@/lib/utils/common';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isIFinancialStatements(obj: any): obj is IFinancialStatements {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    isIBalanceSheet(obj.balanceSheet) &&
    isIComprehensiveIncome(obj.comprehensiveIncome) &&
    isICashFlow(obj.cashFlow)
  );
}

export function isIFinancialReportJSON(obj: unknown): obj is IFinancialReportJSON {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  const o = obj as IFinancialReportJSON;
  return (
    isIBalanceSheet(o.balanceSheet.balanceSheet) &&
    isIComprehensiveIncome(o.comprehensiveIncome.comprehensiveIncome) &&
    isICashFlow(o.cashFlow.cashFlow) &&
    isStringNumberPair(o.balanceSheet.balanceSheetRatios) &&
    isStringNumberPair(o.comprehensiveIncome.comprehensiveIncomeRatios) &&
    isStringNumberPair(o.cashFlow.cashFlowRatios) &&
    typeof o.lifeCycle === 'string' &&
    typeof o.creditRating === 'string' &&
    typeof o.financialStatementsAnalysis === 'string' &&
    typeof o.summary === 'string'
  );
}
