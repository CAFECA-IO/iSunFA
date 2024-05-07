import { IBalanceSheet, isIBalanceSheet } from './balance_sheet';
import { ICashFlow, isICashFlow } from './cash_flow';
import { IComprehensiveIncome, isIComprehensiveIncome } from './comprehensive_income';

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
    isIBalanceSheet(o.balanceSheet) &&
    isIComprehensiveIncome(o.comprehensiveIncome) &&
    isICashFlow(o.cashFlow) &&
    typeof o.lifeCycle === 'string' &&
    typeof o.creditRating === 'string' &&
    typeof o.financialStatementsAnalysis === 'string' &&
    typeof o.summary === 'string'
  );
}
