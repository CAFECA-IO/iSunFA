import { ReportSheetType } from '@/constants/report';
import FinancialReportGenerator from '@/lib/utils/financial_report/financial_report_generator';
import {
  calculateIncomeStatementNetIncome,
  mappingAccountToSheetDisplay,
  transformForestToMap,
  transformLineItemsFromDBToMap,
  updateAccountAmounts,
} from '@/lib/utils/account';
import { IAccountForSheetDisplay, IAccountNode } from '@/interfaces/accounting_account';
import incomeStatementMapping from '@/constants/account_sheet_mapping/income_statement_mapping.json';

export default class IncomeStatementGenerator extends FinancialReportGenerator {
  constructor(companyId: number, startDateInSecond: number, endDateInSecond: number) {
    const reportSheetType = ReportSheetType.INCOME_STATEMENT;
    super(companyId, startDateInSecond, endDateInSecond, reportSheetType);
  }

  public override async generateFinancialReportTree(): Promise<IAccountNode[]> {
    const lineItemsFromDB = await this.getAllLineItemsByReportSheet();
    const accountForest = await this.getAccountForestByReportSheet();

    const lineItemsMap = transformLineItemsFromDBToMap(lineItemsFromDB);

    let updatedAccountForest = updateAccountAmounts(accountForest, lineItemsMap);

    updatedAccountForest = calculateIncomeStatementNetIncome(updatedAccountForest);
    return updatedAccountForest;
  }

  public override async generateFinancialReportMap(): Promise<Map<string, IAccountNode>> {
    const accountForest = await this.generateFinancialReportTree();
    const accountMap = transformForestToMap(accountForest);
    return accountMap;
  }

  public override async generateFinancialReportArray(): Promise<IAccountForSheetDisplay[]> {
    const accountMap = await this.generateFinancialReportMap();

    return mappingAccountToSheetDisplay(accountMap, incomeStatementMapping);
  }
}
