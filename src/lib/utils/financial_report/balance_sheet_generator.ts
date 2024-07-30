import { ReportSheetType } from '@/constants/report';
import FinancialReportGenerator from '@/lib/utils/financial_report/financial_report_generator';
import {
  mappingAccountToSheetDisplay,
  transformForestToMap,
  transformLineItemsFromDBToMap,
  updateAccountAmounts,
} from '@/lib/utils/account/common';
import { IAccountForSheetDisplay, IAccountNode, IAccountReadyForFrontend } from '@/interfaces/accounting_account';
import balanceSheetMapping from '@/constants/account_sheet_mapping/balance_sheet_mapping.json';
import { BalanceSheetOtherInfo } from '@/interfaces/report';
import IncomeStatementGenerator from '@/lib/utils/financial_report/income_statement_generator';
import { DAY_IN_YEAR } from '@/constants/common';

export default class BalanceSheetGenerator extends FinancialReportGenerator {
  private incomeStatementGenerator: IncomeStatementGenerator;

  constructor(companyId: number, startDateInSecond: number, endDateInSecond: number) {
    const reportSheetType = ReportSheetType.BALANCE_SHEET;
    super(companyId, startDateInSecond, endDateInSecond, reportSheetType);

    this.incomeStatementGenerator = new IncomeStatementGenerator(
      companyId,
      startDateInSecond,
      endDateInSecond
    );
  }

  public override async generateFinancialReportTree(curPeriod: boolean): Promise<IAccountNode[]> {
    const lineItemsFromDB = await this.getAllLineItemsByReportSheet(curPeriod);
    const accountForest = await this.getAccountForestByReportSheet();

    const lineItemsMap = transformLineItemsFromDBToMap(lineItemsFromDB);

    const updatedAccountForest = updateAccountAmounts(accountForest, lineItemsMap);
    return updatedAccountForest;
  }

  public override async generateFinancialReportMap(curPeriod: boolean): Promise<
    Map<
      string,
      {
        accountNode: IAccountNode;
        percentage: number;
      }
    >
  > {
    const accountForest = await this.generateFinancialReportTree(curPeriod);
    const accountMap = transformForestToMap(accountForest);
    return accountMap;
  }

  public override async generateFinancialReportArray(curPeriod: boolean): Promise<IAccountForSheetDisplay[]> {
    const accountMap = await this.generateFinancialReportMap(curPeriod);

    return mappingAccountToSheetDisplay(accountMap, balanceSheetMapping);
  }

  static calculateDaysSalesOutstanding(
    accountReceivable: IAccountReadyForFrontend,
    salesTotal: IAccountReadyForFrontend
  ) {
    // DSO = (Account Receivable / Sales) * 365
    const curDso = salesTotal.curPeriodAmount !== 0 ? (accountReceivable.curPeriodAmount / salesTotal.curPeriodAmount) * DAY_IN_YEAR : 0;
    const preDso = salesTotal.prePeriodAmount !== 0 ? (accountReceivable.prePeriodAmount / salesTotal.prePeriodAmount) * DAY_IN_YEAR : 0;
    const dso = {
      curDso,
      preDso,
    };

    return dso;
  }

  // Info: (20240729 - Murky) I need data of 2 two periods before, so this on can't be calculated
  // this function is wrong, need to be fixed
  static calculateInventoryTurnoverDays(
    operatingCost: IAccountReadyForFrontend,
    inventory: IAccountReadyForFrontend
  ) {
    // Inventory turnover days = ((Inventory begin + Inventory end) / 2)/ Operating cost) * 365
    const curInventoryTurnoverDays =
      operatingCost.curPeriodAmount !== 0
        ? (((inventory.curPeriodAmount + inventory.prePeriodAmount) / 2) / operatingCost.curPeriodAmount) * DAY_IN_YEAR
        : 0;

    // Info: (20240729 - Murky) I need data of 2 two periods before, so this on can't be calculated
    const preInventoryTurnoverDays = 0;
    const inventoryTurnoverDays = {
      curInventoryTurnoverDays,
      preInventoryTurnoverDays,
    };

    return inventoryTurnoverDays;
  }

  // Info: (20240729 - Murky) temporary not using this
  // eslint-disable-next-line class-methods-use-this
  public override generateOtherInfo(
    balanceSheetContent: IAccountReadyForFrontend[],
    incomeStatementContent: IAccountReadyForFrontend[]
  ): BalanceSheetOtherInfo {
    const accountMap = new Map<string, IAccountReadyForFrontend>();
    balanceSheetContent.forEach((account) => {
      accountMap.set(account.code, account);
    });

    incomeStatementContent.forEach((account) => {
      accountMap.set(account.code, account);
    });

    const accountReceivable = accountMap.get('1170');
    const salesTotal = accountMap.get('4100');

    let dso = {
      curDso: 0,
      preDso: 0,
    };

    if (accountReceivable && salesTotal) {
      dso = BalanceSheetGenerator.calculateDaysSalesOutstanding(accountReceivable, salesTotal);
    }

    const operatingCost = accountMap.get('5000');
    const inventory = accountMap.get('130X');

    let inventoryTurnoverDays = {
      curInventoryTurnoverDays: 0,
      preInventoryTurnoverDays: 0,
    };

    if (operatingCost && inventory) {
      inventoryTurnoverDays = BalanceSheetGenerator.calculateInventoryTurnoverDays(operatingCost, inventory);
    }

    const otherInfo = {
      dso,
      inventoryTurnoverDays,
    };
    return otherInfo;
  }

  public override async generateReport() {
    const balanceSheetContent = await this.generateIAccountReadyForFrontendArray();
    const incomeStatementContent = await this.incomeStatementGenerator.generateIAccountReadyForFrontendArray();
    const otherInfo = await this.generateOtherInfo(balanceSheetContent, incomeStatementContent);
    return {
      content: balanceSheetContent,
      otherInfo,
    };
  }
}
