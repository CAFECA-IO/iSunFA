import { AccountSheetType } from "@/constants/account";
import FinancialReportGenerator from "@/lib/utils/financial_report/financial_report_generator";
import {
  mappingAccountToSheetDisplay,
  transformForestToMap,
  transformLineItemsFromDBToMap,
  updateAccountAmounts,
} from '@/lib/utils/account';
import { IAccountForSheetDisplay, IAccountNode } from "@/interfaces/accounting_account";
import balanceSheetMapping from '@/constants/account_sheet_mapping/balance_sheet_mapping.json';

export default class BalanceSheetGenerator extends FinancialReportGenerator {
  constructor(companyId: number, startDateInSecond: number, endDateInSecond: number) {
    const accountSheetType = AccountSheetType.BALANCE_SHEET;
    super(companyId, startDateInSecond, endDateInSecond, accountSheetType);
  }

  public override async generateFinancialReportTree(): Promise<IAccountNode[]> {
    const lineItemsFromDB = await this.getAllLineItemsByAccountSheet();
    const accountForest = await this.getAccountForestByAccountSheet();

    const lineItemsMap = transformLineItemsFromDBToMap(lineItemsFromDB);

    const updatedAccountForest = updateAccountAmounts(accountForest, lineItemsMap);
    return updatedAccountForest;
  }

  public override async generateFinancialReportMap(): Promise<Map<string, IAccountNode>> {
    const accountForest = await this.generateFinancialReportTree();
    const accountMap = transformForestToMap(accountForest);
    return accountMap;
  }

  public override async generateFinancialReportArray(): Promise<IAccountForSheetDisplay[]> {
    const accountMap = await this.generateFinancialReportMap();

    return mappingAccountToSheetDisplay(accountMap, balanceSheetMapping);
  }
}
