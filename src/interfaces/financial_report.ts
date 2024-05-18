import { IBalanceSheet } from '@/interfaces/balance_sheet';
import { ICashFlow } from '@/interfaces/cash_flow';
import { LifeCycleType } from '@/constants/financial_report';
import { IComprehensiveIncome } from '@/interfaces/comprehensive_income';

// Todo Murky (20240516): move to constants and change to SNAKE_CASE

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
  lifeCycle: LifeCycleType;
  creditRating: string;
  financialStatementsAnalysis: string;
  summary: string;
}
