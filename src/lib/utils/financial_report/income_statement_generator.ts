import { ReportSheetType } from '@/constants/report';
import FinancialReportGenerator from '@/lib/utils/financial_report/financial_report_generator';
import {
  calculateIncomeStatementNetIncome,
  mappingAccountToSheetDisplay,
  transformForestToMap,
  transformLineItemsFromDBToMap,
  updateAccountAmounts,
} from '@/lib/utils/account/common';
import { IAccountForSheetDisplay, IAccountNode } from '@/interfaces/accounting_account';
import incomeStatementMapping from '@/constants/account_sheet_mapping/income_statement_mapping.json';

export default class IncomeStatementGenerator extends FinancialReportGenerator {
  constructor(companyId: number, startDateInSecond: number, endDateInSecond: number) {
    const reportSheetType = ReportSheetType.INCOME_STATEMENT;
    super(companyId, startDateInSecond, endDateInSecond, reportSheetType);
  }

  // Info: Calculate revenue and expense ratio (20240416 - Murky)
  // eslint-disable-next-line class-methods-use-this
  private calculateRevenueAndExpenseRatio(
    accountMap: Map<
      string,
      {
        accountNode: IAccountNode;
        percentage: number;
      }
    >
  ): number {
    const revenue = accountMap.get('4000')?.accountNode.amount || 0;
    const totalExpense = accountMap.get('6000')?.accountNode.amount || 0;
    const totalCost = accountMap.get('5000')?.accountNode.amount || 0;
    const totalCostAndExpense = totalExpense + totalCost;
    return totalCostAndExpense === 0 ? 0 : revenue / totalCostAndExpense;
  }

  public override async generateFinancialReportTree(): Promise<IAccountNode[]> {
    const lineItemsFromDB = await this.getAllLineItemsByReportSheet();
    const accountForest = await this.getAccountForestByReportSheet();

    const lineItemsMap = transformLineItemsFromDBToMap(lineItemsFromDB);

    let updatedAccountForest = updateAccountAmounts(accountForest, lineItemsMap);

    updatedAccountForest = calculateIncomeStatementNetIncome(updatedAccountForest);
    return updatedAccountForest;
  }

  public override async generateFinancialReportMap(): Promise<
    Map<
      string,
      {
        accountNode: IAccountNode;
        percentage: number;
      }
    >
  > {
    const accountForest = await this.generateFinancialReportTree();
    const accountMap = transformForestToMap(accountForest);
    return accountMap;
  }

  public override async generateFinancialReportArray(): Promise<IAccountForSheetDisplay[]> {
    const accountMap = await this.generateFinancialReportMap();

    // Info: Calculate revenue and expense ratio (20240726 - Murky)
    const revenueAndExpenseRatio = this.calculateRevenueAndExpenseRatio(accountMap);
    const accountList = mappingAccountToSheetDisplay(accountMap, incomeStatementMapping);
    accountList.push({
      code: 'RevenueAndExpenseRatio',
      name: 'Revenue and Expense Ratio',
      amount: revenueAndExpenseRatio,
      percentage: null,
      indent: 0,
    });
    return accountList;
  }
}
