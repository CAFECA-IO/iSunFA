import { ReportSheetType } from '@/constants/report';
import FinancialReportGenerator from '@/lib/utils/financial_report/financial_report_generator';
import {
  mappingAccountToSheetDisplay,
  transformForestToMap,
  transformLineItemsFromDBToMap,
  updateAccountAmounts,
} from '@/lib/utils/account/common';
import { IAccountForSheetDisplay, IAccountNode } from '@/interfaces/accounting_account';
import balanceSheetMapping from '@/constants/account_sheet_mapping/balance_sheet_mapping.json';

export default class BalanceSheetGenerator extends FinancialReportGenerator {
  constructor(companyId: number, startDateInSecond: number, endDateInSecond: number) {
    const reportSheetType = ReportSheetType.BALANCE_SHEET;
    super(companyId, startDateInSecond, endDateInSecond, reportSheetType);
  }

  public override async generateFinancialReportTree(): Promise<IAccountNode[]> {
    const lineItemsFromDB = await this.getAllLineItemsByReportSheet();
    const accountForest = await this.getAccountForestByReportSheet();

    const lineItemsMap = transformLineItemsFromDBToMap(lineItemsFromDB);

    const updatedAccountForest = updateAccountAmounts(accountForest, lineItemsMap);
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

    return mappingAccountToSheetDisplay(accountMap, balanceSheetMapping);
  }
}
