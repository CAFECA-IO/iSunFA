import { ReportSheetType } from '@/constants/report';
import FinancialReportGenerator from '@/lib/utils/report/financial_report_generator';
import BalanceSheetGenerator from '@/lib/utils/report/balance_sheet_generator';
import IncomeStatementGenerator from '@/lib/utils/report/income_statement_generator';
import CashFlowStatementGenerator from '@/lib/utils/report/cash_flow_statement_generator';

export default class FinancialReportGeneratorFactory {
  static async createGenerator(
    companyId: number,
    startDateInSecond: number,
    endDateInSecond: number,
    reportSheetType: ReportSheetType
  ): Promise<FinancialReportGenerator> {
    switch (reportSheetType) {
      case ReportSheetType.BALANCE_SHEET:
        return new BalanceSheetGenerator(companyId, startDateInSecond, endDateInSecond);
      case ReportSheetType.INCOME_STATEMENT:
        return new IncomeStatementGenerator(companyId, startDateInSecond, endDateInSecond);
      case ReportSheetType.CASH_FLOW_STATEMENT:
        return CashFlowStatementGenerator.createInstance(
          companyId,
          startDateInSecond,
          endDateInSecond
        );
      default:
        throw new Error(`Unsupported account sheet type: ${reportSheetType}`);
    }
  }
}
