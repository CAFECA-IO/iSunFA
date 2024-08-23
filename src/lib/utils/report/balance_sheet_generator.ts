import { ReportSheetType } from '@/constants/report';
import FinancialReportGenerator from '@/lib/utils/report/financial_report_generator';
import {
  mappingAccountToSheetDisplay,
  transformForestToMap,
  transformLineItemsFromDBToMap,
  updateAccountAmounts,
} from '@/lib/utils/account/common';
import {
  IAccountForSheetDisplay,
  IAccountNode,
  IAccountReadyForFrontend,
} from '@/interfaces/accounting_account';
import balanceSheetMapping from '@/constants/account_sheet_mapping/balance_sheet_mapping.json';
import { BalanceSheetOtherInfo } from '@/interfaces/report';
import IncomeStatementGenerator from '@/lib/utils/report/income_statement_generator';
import { DAY_IN_YEAR } from '@/constants/common';
import { EMPTY_I_ACCOUNT_READY_FRONTEND } from '@/constants/financial_report';
import { ASSET_CODE, SPECIAL_ACCOUNTS } from '@/constants/account';
import { timestampToString } from '@/lib/utils/common';
import { ILineItemIncludeAccount } from '@/interfaces/line_item';
import { findUniqueAccountByCodeInPrisma } from '@/lib/utils/repo/account.repo';

export default class BalanceSheetGenerator extends FinancialReportGenerator {
  private incomeStatementGenerator: IncomeStatementGenerator;

  private incomeStatementGeneratorFromTimeZero: IncomeStatementGenerator;

  constructor(companyId: number, startDateInSecond: number, endDateInSecond: number) {
    const reportSheetType = ReportSheetType.BALANCE_SHEET;
    super(companyId, 0, endDateInSecond, reportSheetType);

    this.incomeStatementGenerator = new IncomeStatementGenerator(
      companyId,
      startDateInSecond,
      endDateInSecond
    );

    this.incomeStatementGeneratorFromTimeZero = new IncomeStatementGenerator(
      companyId,
      0,
      endDateInSecond
    );
  }

  // Info: (20240729 - Murky) this special function is to temporally  close account from income statement to retain earning, but this won't effect income statement

  private async closeAccountFromIncomeStatement(
    curPeriod: boolean
  ): Promise<ILineItemIncludeAccount[]> {
    const incomeStatementContent =
      await this.incomeStatementGeneratorFromTimeZero.generateIAccountReadyForFrontendArray();

    const netIncome =
      incomeStatementContent.find((account) => account.code === SPECIAL_ACCOUNTS.NET_INCOME.code) ||
      EMPTY_I_ACCOUNT_READY_FRONTEND;
    const otherComprehensiveIncome =
      incomeStatementContent.find(
        (account) => account.code === SPECIAL_ACCOUNTS.OTHER_COMPREHENSIVE_INCOME.code
      ) || EMPTY_I_ACCOUNT_READY_FRONTEND;

    const closeAccount: ILineItemIncludeAccount[] = [];

    const netIncomeAccount = await findUniqueAccountByCodeInPrisma(
      SPECIAL_ACCOUNTS.NET_INCOME.code
    );
    const otherComprehensiveIncomeAccount = await findUniqueAccountByCodeInPrisma(
      SPECIAL_ACCOUNTS.OTHER_COMPREHENSIVE_INCOME.code
    );

    closeAccount.push({
      id: -1,
      amount: curPeriod ? netIncome.curPeriodAmount : netIncome.prePeriodAmount,
      description: SPECIAL_ACCOUNTS.NET_INCOME.name,
      debit: SPECIAL_ACCOUNTS.NET_INCOME.debit,
      accountId: netIncomeAccount?.id || -1,
      voucherId: -1,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      account: netIncomeAccount || {
        ...SPECIAL_ACCOUNTS.NET_INCOME,
        id: -1,
        companyId: this.companyId,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null,
      },
    });

    closeAccount.push({
      id: -1,
      amount: curPeriod
        ? otherComprehensiveIncome.curPeriodAmount
        : otherComprehensiveIncome.prePeriodAmount,
      description: SPECIAL_ACCOUNTS.OTHER_COMPREHENSIVE_INCOME.name,
      debit: SPECIAL_ACCOUNTS.OTHER_COMPREHENSIVE_INCOME.debit,
      accountId: otherComprehensiveIncomeAccount?.id || -1,
      voucherId: -1,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      account: otherComprehensiveIncomeAccount || {
        ...SPECIAL_ACCOUNTS.OTHER_COMPREHENSIVE_INCOME,
        id: -1,
        companyId: this.companyId,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null,
      },
    });

    return closeAccount;
  }

  public override async generateFinancialReportTree(curPeriod: boolean): Promise<IAccountNode[]> {
    let lineItemsFromDB = await this.getAllLineItemsByReportSheet(curPeriod);

    // Info: (20240801 - Murky) 暫時關閉本期損益和其他其他綜合損益權益
    const closeAccount = await this.closeAccountFromIncomeStatement(curPeriod);
    lineItemsFromDB = lineItemsFromDB.concat(closeAccount);

    const accountForest = await this.getAccountForestByReportSheet();

    const lineItemsMap = transformLineItemsFromDBToMap(lineItemsFromDB);

    const updatedAccountForest = updateAccountAmounts(accountForest, lineItemsMap);

    return updatedAccountForest;
  }

  static calculateLiabilityAndEquity(accountTree: IAccountNode[]) {
    const liability = accountTree.find((account) => account.code === '2XXX');
    const equity = accountTree.find((account) => account.code === '3XXX');
    const liabilityAndEquity = accountTree.find((account) => account.code === '3X2X');

    if (liabilityAndEquity) {
      liabilityAndEquity.amount = liability?.amount || 0;
      liabilityAndEquity.amount += equity?.amount || 0;
    }
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
    BalanceSheetGenerator.calculateLiabilityAndEquity(accountForest);
    const accountMap = transformForestToMap(accountForest);

    return accountMap;
  }

  public override async generateFinancialReportArray(
    curPeriod: boolean
  ): Promise<IAccountForSheetDisplay[]> {
    const accountMap = await this.generateFinancialReportMap(curPeriod);

    return mappingAccountToSheetDisplay(accountMap, balanceSheetMapping);
  }

  static getAmount(account: IAccountReadyForFrontend) {
    const cur = Math.abs(account.curPeriodAmount);
    const pre = Math.abs(account.prePeriodAmount);

    return {
      cur,
      pre,
    };
  }

  static calculateAssetLiabilityRatio(asset: number, liability: number, equity: number) {
    const total = asset + liability + equity;
    let assetPercentage = total === 0 ? 0 : Math.round((asset / total) * 100);
    let liabilityPercentage = total === 0 ? 0 : Math.round((liability / total) * 100);
    let equityPercentage = total === 0 ? 0 : Math.round((equity / total) * 100);

    const surplus = 100 - (assetPercentage + liabilityPercentage + equityPercentage);

    const maxPercentage = Math.max(assetPercentage, liabilityPercentage, equityPercentage);

    // Info: (20240731 - Murky) 判斷哪一項是最大的，並將surplus加上去
    if (total > 0 && surplus !== 0) {
      if (maxPercentage === assetPercentage) {
        assetPercentage += surplus;
      } else if (maxPercentage === liabilityPercentage) {
        liabilityPercentage += surplus;
      } else if (maxPercentage === equityPercentage) {
        equityPercentage += surplus;
      }
    }

    return {
      assetPercentage,
      liabilityPercentage,
      equityPercentage,
    };
  }

  static getAssetLiabilityRatio(
    curDateInSecond: number,
    lastPeriodDateInSecond: number,
    accountMap: Map<string, IAccountReadyForFrontend>
  ) {
    const curDateString = timestampToString(curDateInSecond).date;
    const lastPeriodDateString = timestampToString(lastPeriodDateInSecond).date;
    const asset =
      accountMap.get(SPECIAL_ACCOUNTS.ASSET_TOTAL.code) || EMPTY_I_ACCOUNT_READY_FRONTEND;
    const liability =
      accountMap.get(SPECIAL_ACCOUNTS.LIABILITY_TOTAL.code) || EMPTY_I_ACCOUNT_READY_FRONTEND;
    const equity =
      accountMap.get(SPECIAL_ACCOUNTS.EQUITY_TOTAL.code) || EMPTY_I_ACCOUNT_READY_FRONTEND;

    const assetAmount = BalanceSheetGenerator.getAmount(asset);
    const liabilityAmount = BalanceSheetGenerator.getAmount(liability);
    const equityAmount = BalanceSheetGenerator.getAmount(equity);

    const curRatio = BalanceSheetGenerator.calculateAssetLiabilityRatio(
      assetAmount.cur,
      liabilityAmount.cur,
      equityAmount.cur
    );

    const preRatio = BalanceSheetGenerator.calculateAssetLiabilityRatio(
      assetAmount.pre,
      liabilityAmount.pre,
      equityAmount.pre
    );

    const labels = ['資產', '負債', '權益'];
    return {
      [curDateString]: {
        data: Object.values(curRatio),
        labels,
      },
      [lastPeriodDateString]: {
        data: Object.values(preRatio),
        labels,
      },
    };
  }

  static getTopAssetsPercentage(asset: IAccountReadyForFrontend[]) {
    const curTop5Asset = asset.sort((a, b) => b.curPeriodAmount - a.curPeriodAmount).slice(0, 5);
    const preTop5Asset = asset.sort((a, b) => b.prePeriodAmount - a.prePeriodAmount).slice(0, 5);
    const curSurplus = 100 - curTop5Asset.reduce((acc, cur) => acc + cur.curPeriodPercentage, 0);
    const preSurplus = 100 - preTop5Asset.reduce((acc, cur) => acc + cur.prePeriodPercentage, 0);

    const curPercentage = curTop5Asset.map((account) => account.curPeriodPercentage);
    const curAssetName = curTop5Asset.map((account) => account.name);

    const prePercentage = preTop5Asset.map((account) => account.prePeriodPercentage);
    const preAssetName = preTop5Asset.map((account) => account.name);

    if (curSurplus > 0) {
      curPercentage.push(curSurplus);
      curAssetName.push('其他');
    }

    if (preSurplus > 0) {
      prePercentage.push(preSurplus);
      preAssetName.push('其他');
    }

    return {
      curPercentage,
      curAssetName,
      prePercentage,
      preAssetName,
    };
  }

  static getMaxAsset(
    curDateInSecond: number,
    lastPeriodDateInSecond: number,
    accountMap: Map<string, IAccountReadyForFrontend>
  ) {
    const curDateString = timestampToString(curDateInSecond).date;
    const lastPeriodDateString = timestampToString(lastPeriodDateInSecond).date;

    const asset: IAccountReadyForFrontend[] = [];

    ASSET_CODE.forEach((code) => {
      const account = accountMap.get(code);
      if (account) {
        asset.push(account);
      }
    });

    const { curPercentage, curAssetName, prePercentage, preAssetName } =
      BalanceSheetGenerator.getTopAssetsPercentage(asset);

    return {
      [curDateString]: {
        data: curPercentage,
        labels: curAssetName,
      },
      [lastPeriodDateString]: {
        data: prePercentage,
        labels: preAssetName,
      },
    };
  }

  static calculateDaysSalesOutstanding(accountMap: Map<string, IAccountReadyForFrontend>) {
    const accountReceivable =
      accountMap.get(SPECIAL_ACCOUNTS.OPERATING_COST.code) || EMPTY_I_ACCOUNT_READY_FRONTEND;
    const salesTotal =
      accountMap.get(SPECIAL_ACCOUNTS.INVENTORY_TOTAL.code) || EMPTY_I_ACCOUNT_READY_FRONTEND;
    // Info: (20240731 - Murky) DSO = (Account Receivable / Sales) * 365

    const curDso =
      salesTotal.curPeriodAmount !== 0
        ? (accountReceivable.curPeriodAmount / salesTotal.curPeriodAmount) * DAY_IN_YEAR
        : 0;
    const preDso =
      salesTotal.prePeriodAmount !== 0
        ? (accountReceivable.prePeriodAmount / salesTotal.prePeriodAmount) * DAY_IN_YEAR
        : 0;
    const dso = {
      curDso,
      preDso,
    };

    return dso;
  }

  // Info: (20240729 - Murky) I need data of 2 two periods before, so this on can't be calculated
  // this function is wrong, need to be fixed
  static calculateInventoryTurnoverDays(accountMap: Map<string, IAccountReadyForFrontend>) {
    const operatingCost =
      accountMap.get(SPECIAL_ACCOUNTS.OPERATING_COST.code) || EMPTY_I_ACCOUNT_READY_FRONTEND;
    const inventory =
      accountMap.get(SPECIAL_ACCOUNTS.INVENTORY_TOTAL.code) || EMPTY_I_ACCOUNT_READY_FRONTEND;
    // Inventory turnover days = ((Inventory begin + Inventory end) / 2)/ Operating cost) * 365
    const curInventoryTurnoverDays =
      operatingCost.curPeriodAmount !== 0
        ? ((inventory.curPeriodAmount + inventory.prePeriodAmount) /
            2 /
            operatingCost.curPeriodAmount) *
          DAY_IN_YEAR
        : 0;

    // Info: (20240729 - Murky) I need data of 2 two periods before, so this on can't be calculated
    const preInventoryTurnoverDays = 0;
    const inventoryTurnoverDays = {
      curInventoryTurnoverDays,
      preInventoryTurnoverDays,
    };

    return inventoryTurnoverDays;
  }

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

    const assetLiabilityRatio = BalanceSheetGenerator.getAssetLiabilityRatio(
      this.endDateInSecond,
      this.lastPeriodEndDateInSecond,
      accountMap
    );

    const assetMixRatio = BalanceSheetGenerator.getMaxAsset(
      this.endDateInSecond,
      this.lastPeriodEndDateInSecond,
      accountMap
    );

    const dso = BalanceSheetGenerator.calculateDaysSalesOutstanding(accountMap);

    const inventoryTurnoverDays = BalanceSheetGenerator.calculateInventoryTurnoverDays(accountMap);

    const otherInfo = {
      assetLiabilityRatio,
      assetMixRatio,
      dso,
      inventoryTurnoverDays,
    };
    return otherInfo;
  }

  public override async generateReport() {
    // Info: (20240731 - Murky)
    // const currentDateInMillisecond = timestampInMilliSeconds(this.endDateInSecond);
    // const currentDate = new Date(currentDateInMillisecond);
    // const lastPeriodDateInMillisecond = timestampInMilliSeconds(this.lastPeriodEndDateInSecond);
    // const lastPeriodDate = new Date(lastPeriodDateInMillisecond);
    const balanceSheetContent = await this.generateIAccountReadyForFrontendArray();

    const incomeStatementContent =
      await this.incomeStatementGenerator.generateIAccountReadyForFrontendArray();
    const otherInfo = this.generateOtherInfo(balanceSheetContent, incomeStatementContent);
    return {
      content: balanceSheetContent,
      otherInfo,
    };
  }
}
