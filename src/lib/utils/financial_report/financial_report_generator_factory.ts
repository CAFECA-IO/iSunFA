import { AccountSheetType } from '@/constants/account';
import FinancialReportGenerator from '@/lib/utils/financial_report/financial_report_generator';
import BalanceSheetGenerator from '@/lib/utils/financial_report/balance_sheet_generator';
import IncomeStatementGenerator from '@/lib/utils/financial_report/income_statement_generator';
import CashFlowStatementGenerator from '@/lib/utils/financial_report/cash_flow_statement_generator';

export default class FinancialReportGeneratorFactory {
  static async createGenerator(
    companyId: number,
    startDateInSecond: number,
    endDateInSecond: number,
    accountSheetType: AccountSheetType
  ): Promise<FinancialReportGenerator> {
    switch (accountSheetType) {
      case AccountSheetType.BALANCE_SHEET:
        return new BalanceSheetGenerator(companyId, startDateInSecond, endDateInSecond);
      case AccountSheetType.INCOME_STATEMENT:
        return new IncomeStatementGenerator(companyId, startDateInSecond, endDateInSecond);
      case AccountSheetType.CASH_FLOW_STATEMENT:
        return CashFlowStatementGenerator.createInstance(
          companyId,
          startDateInSecond,
          endDateInSecond
        );
      default:
        throw new Error(`Unsupported account sheet type: ${accountSheetType}`);
    }
  }
}
