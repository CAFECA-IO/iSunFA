import { IBalanceSheet, isIBalanceSheet } from '@/interfaces/balance_sheet';
import { ICashFlow, isICashFlow } from '@/interfaces/cash_flow';
import { isStringNumberPair } from '@/interfaces/common';
import { IComprehensiveIncome, isIComprehensiveIncome } from '@/interfaces/comprehensive_income';

// Todo Murky (20240516): move to constants and change to SNAKE_CASE
export enum ILifeCycleType {
  introduction = '初創期',
  growth = '成長期',
  maturity = '成熟期',
  decline = '衰退期',
  renewal = '重生期',
  unknown = '未知',
}

export interface IFinancialStatements {
  balanceSheet: IBalanceSheet;
  comprehensiveIncome: IComprehensiveIncome;
  cashFlow: ICashFlow;
}

export interface IFinancialReportJSON {
  balanceSheet: {
    balanceSheet: IBalanceSheet;
    balanceSheetRatios: { [key: string]: number };
    balanceSheetAnalysis: string;
  };
  comprehensiveIncome: {
    comprehensiveIncome: IComprehensiveIncome;
    comprehensiveIncomeRatios: { [key: string]: number };
    comprehensiveIncomeAnalysis: string;
  };
  cashFlow: {
    cashFlow: ICashFlow;
    cashFlowRatios: { [key: string]: number };
    cashFlowAnalysis: string;
  };
  lifeCycle: ILifeCycleType;
  creditRating: string;
  financialStatementsAnalysis: string;
  summary: string;
}

// Info Murky (20240505): type guards

// ToDo: move to utils (20240516 - Murky)
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

// ToDo: move to utils (20240516 - Murky)
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
