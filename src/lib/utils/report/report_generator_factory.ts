import { ReportSheetType } from '@/constants/report';
import BalanceSheetGenerator from '@/lib/utils/report/balance_sheet_generator';
import IncomeStatementGenerator from '@/lib/utils/report/income_statement_generator';
import CashFlowStatementGenerator from '@/lib/utils/report/cash_flow_statement_generator';
import ReportGenerator from '@/lib/utils/report/report_generator';
import Report401Generator from './report_401_generator';

export default class ReportGeneratorFactory {
  static async createGenerator(
    companyId: number,
    startDateInSecond: number,
    endDateInSecond: number,
    reportSheetType: ReportSheetType
  ): Promise<ReportGenerator> {
    switch (reportSheetType) {
      case ReportSheetType.BALANCE_SHEET:
        return new BalanceSheetGenerator(companyId, 0, endDateInSecond);
      case ReportSheetType.INCOME_STATEMENT:
        return new IncomeStatementGenerator(companyId, startDateInSecond, endDateInSecond);
      case ReportSheetType.CASH_FLOW_STATEMENT:
        return CashFlowStatementGenerator.createInstance(
          companyId,
          startDateInSecond,
          endDateInSecond
        );
      case ReportSheetType.REPORT_401:
        return new Report401Generator(companyId, startDateInSecond, endDateInSecond);
      default:
        throw new Error(`Unsupported account sheet type: ${reportSheetType}`);
    }
  }
}
