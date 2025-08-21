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
import { BalanceSheetOtherInfo, IFinancialReportInDB } from '@/interfaces/report';
import IncomeStatementGenerator from '@/lib/utils/report/income_statement_generator';
import { DAY_IN_YEAR } from '@/constants/common';
import { EMPTY_I_ACCOUNT_READY_FRONTEND } from '@/constants/financial_report';
import { ASSET_CODE, SPECIAL_ACCOUNTS } from '@/constants/account';
import { getTimestampOfFirstDateOfThisYear, timestampToString } from '@/lib/utils/common';
import { DecimalOperations } from '@/lib/utils/decimal_operations';
import { ILineItemIncludeAccount } from '@/interfaces/line_item';
import { findAccountByIdInPrisma } from '@/lib/utils/repo/account.repo';
import { Prisma } from '@prisma/client';
import { DecimalCompatibility } from '@/lib/utils/decimal_compatibility';

export default class BalanceSheetGenerator extends FinancialReportGenerator {
  private startSecondOfYear: number;

  private endSecondOfLastYear: number;

  private incomeStatementGenerator: IncomeStatementGenerator;

  private incomeStatementGeneratorFromTimeZeroToBeginOfYear: IncomeStatementGenerator;

  private incomeStatementGeneratorFromBeginOfYearToEndDate: IncomeStatementGenerator;

  constructor(accountBookId: number, startDateInSecond: number, endDateInSecond: number) {
    const reportSheetType = ReportSheetType.BALANCE_SHEET;
    super(accountBookId, startDateInSecond, endDateInSecond, reportSheetType);

    this.startSecondOfYear = getTimestampOfFirstDateOfThisYear(endDateInSecond);
    this.endSecondOfLastYear = this.startSecondOfYear - 1;
    this.incomeStatementGenerator = new IncomeStatementGenerator(
      accountBookId,
      startDateInSecond,
      endDateInSecond
    );

    // Info: (20241011 - Murky) For Accumulate Profit and Loss
    this.incomeStatementGeneratorFromTimeZeroToBeginOfYear = new IncomeStatementGenerator(
      accountBookId,
      0,
      this.endSecondOfLastYear
    );

    // Info: (20241011 - Murky) For NetIncome
    this.incomeStatementGeneratorFromBeginOfYearToEndDate = new IncomeStatementGenerator(
      accountBookId,
      this.startSecondOfYear,
      endDateInSecond
    );
  }

  // Info: (20240729 - Murky) this special function is to temporally  close account from income statement to retain earning, but this won't effect income statement

  private async closeAccountFromIncomeStatement(
    curPeriod: boolean
  ): Promise<ILineItemIncludeAccount[]> {
    const currentYearISContent =
      await this.incomeStatementGeneratorFromBeginOfYearToEndDate.generateIAccountReadyForFrontendArray();

    const beforeISContent =
      await this.incomeStatementGeneratorFromTimeZeroToBeginOfYear.generateIAccountReadyForFrontendArray();

    // Info: (20241011 - Murky) net income 是本期範圍內的營收
    const netIncome =
      currentYearISContent.find((account) => account.code === SPECIAL_ACCOUNTS.NET_INCOME.code) ||
      EMPTY_I_ACCOUNT_READY_FRONTEND;

    // Info: (20241011 - Murky) Accumulate Profit and loss是本期以前的營收
    const accumulateProfitAndLoss =
      beforeISContent.find((account) => account.code === SPECIAL_ACCOUNTS.NET_INCOME.code) ||
      EMPTY_I_ACCOUNT_READY_FRONTEND;

    const currentOtherComprehensiveIncome =
      currentYearISContent.find(
        (account) => account.code === SPECIAL_ACCOUNTS.OTHER_COMPREHENSIVE_INCOME.code
      ) || EMPTY_I_ACCOUNT_READY_FRONTEND;

    const beforeOtherComprehensiveIncome =
      beforeISContent.find(
        (account) => account.code === SPECIAL_ACCOUNTS.OTHER_COMPREHENSIVE_INCOME.code
      ) || EMPTY_I_ACCOUNT_READY_FRONTEND;

    const closeAccount: ILineItemIncludeAccount[] = [];

    const netIncomeAccount = await findAccountByIdInPrisma(SPECIAL_ACCOUNTS.NET_INCOME.id);

    const otherComprehensiveIncomeAccount = await findAccountByIdInPrisma(
      SPECIAL_ACCOUNTS.OTHER_COMPREHENSIVE_INCOME.id
    );

    const netIncomeInEquity = await findAccountByIdInPrisma(
      SPECIAL_ACCOUNTS.NET_INCOME_IN_EQUITY.id
    );

    const accumulateProfitAndLossInEquity = await findAccountByIdInPrisma(
      SPECIAL_ACCOUNTS.ACCUMULATED_PROFIT_AND_LOSS.id
    );

    const otherEquityOther = await findAccountByIdInPrisma(SPECIAL_ACCOUNTS.OTHER_EQUITY_OTHER.id);

    closeAccount.push({
      id: netIncomeInEquity?.id || -1,
      amount: new Prisma.Decimal(curPeriod ? netIncome.curPeriodAmount : netIncome.prePeriodAmount),
      description: SPECIAL_ACCOUNTS.NET_INCOME_IN_EQUITY.name,
      debit: SPECIAL_ACCOUNTS.NET_INCOME_IN_EQUITY.debit,
      accountId: netIncomeInEquity?.id || -1,
      voucherId: -1,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      account: netIncomeAccount
        ? {
            ...netIncomeAccount,
            code: SPECIAL_ACCOUNTS.NET_INCOME_IN_EQUITY.code,
            debit: SPECIAL_ACCOUNTS.NET_INCOME_IN_EQUITY.debit,
          }
        : {
            ...SPECIAL_ACCOUNTS.NET_INCOME_IN_EQUITY,
            id: -1,
            accountBookId: this.accountBookId,
            createdAt: 1,
            updatedAt: 1,
            deletedAt: null,
            parentId: 0, // TODO: (20241122 - Shirley) 添加預設值
            rootId: 0, // TODO: (20241122 - Shirley) 添加預設值
            note: null, // TODO: (20241122 - Shirley) 添加預設值
          },
    });

    closeAccount.push({
      id: accumulateProfitAndLossInEquity?.id || -1,
      amount: new Prisma.Decimal(
        curPeriod
          ? accumulateProfitAndLoss.curPeriodAmount
          : accumulateProfitAndLoss.prePeriodAmount
      ),
      description: SPECIAL_ACCOUNTS.ACCUMULATED_PROFIT_AND_LOSS.name,
      debit: SPECIAL_ACCOUNTS.ACCUMULATED_PROFIT_AND_LOSS.debit,
      accountId: accumulateProfitAndLossInEquity?.id || -1,
      voucherId: -1,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      account: netIncomeAccount
        ? {
            ...netIncomeAccount,
            code: SPECIAL_ACCOUNTS.ACCUMULATED_PROFIT_AND_LOSS.code,
            debit: SPECIAL_ACCOUNTS.ACCUMULATED_PROFIT_AND_LOSS.debit,
          }
        : {
            ...SPECIAL_ACCOUNTS.ACCUMULATED_PROFIT_AND_LOSS,
            id: -1,
            accountBookId: this.accountBookId,
            createdAt: 1,
            updatedAt: 1,
            deletedAt: null,
            parentId: 0, // TODO: (20241122 - Shirley) 添加預設值
            rootId: 0, // TODO: (20241122 - Shirley) 添加預設值
            note: null, // TODO: (20241122 - Shirley) 添加預設值
          },
    });

    closeAccount.push({
      id: otherEquityOther?.id || -1,
      amount: new Prisma.Decimal(
        curPeriod
          ? currentOtherComprehensiveIncome.curPeriodAmount +
            beforeOtherComprehensiveIncome.curPeriodAmount
          : beforeOtherComprehensiveIncome.prePeriodAmount +
            beforeOtherComprehensiveIncome.prePeriodAmount
      ),
      description: SPECIAL_ACCOUNTS.OTHER_EQUITY_OTHER.name,
      debit: SPECIAL_ACCOUNTS.OTHER_EQUITY_OTHER.debit,
      accountId: otherEquityOther?.id || -1,
      voucherId: -1,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      account: otherComprehensiveIncomeAccount
        ? {
            ...otherComprehensiveIncomeAccount,
            code: SPECIAL_ACCOUNTS.OTHER_EQUITY_OTHER.code,
            debit: SPECIAL_ACCOUNTS.OTHER_EQUITY_OTHER.debit,
          }
        : {
            ...SPECIAL_ACCOUNTS.OTHER_EQUITY_OTHER,
            id: -1,
            accountBookId: this.accountBookId,
            createdAt: 1,
            updatedAt: 1,
            deletedAt: null,
            parentId: 0, // TODO: (20241122 - Shirley) 添加預設值
            rootId: 0, // TODO: (20241122 - Shirley) 添加預設值
            note: null, // TODO: (20241122 - Shirley) 添加預設值
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
      const liabilityAmount = DecimalCompatibility.numberToDecimal(liability?.amount || 0);
      const equityAmount = DecimalCompatibility.numberToDecimal(equity?.amount || 0);
      liabilityAndEquity.amount = DecimalCompatibility.decimalToNumber(
        DecimalOperations.add(liabilityAmount, equityAmount)
      );
    }
  }

  private static calculatePercentageByOperatingRevenue(
    accountMap: Map<
      string,
      {
        accountNode: IAccountNode;
        percentage: number;
      }
    >
  ): Map<
    string,
    {
      accountNode: IAccountNode;
      percentage: number;
    }
  > {
    const totalAsset = accountMap.get(SPECIAL_ACCOUNTS.ASSET_TOTAL.code);
    if (!totalAsset) {
      throw new Error(
        'totalAsset not found in accountMap in calculatePercentageByOperatingRevenue in BalanceSheetGenerator'
      );
    }

    const totalAssetAmount = totalAsset.accountNode.amount;
    const updatedAccountMap = new Map<
      string,
      {
        accountNode: IAccountNode;
        percentage: number;
      }
    >();

    accountMap.forEach((value, key) => {
      updatedAccountMap.set(key, {
        accountNode: value.accountNode,
        percentage: DecimalCompatibility.decimalToNumber(
          DecimalOperations.isZero(DecimalCompatibility.numberToDecimal(totalAssetAmount)) 
            ? '0' 
            : DecimalOperations.divide(
                DecimalCompatibility.numberToDecimal(value.accountNode.amount),
                DecimalCompatibility.numberToDecimal(totalAssetAmount)
              )
        ),
      });
    });

    return updatedAccountMap;
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

    let accountMap = transformForestToMap(accountForest);
    /**
     * Info: (20241018 - Murky)
     * @description 百分比應該用資產或 "負債與權益" 做基底，先從這邊patch, 之後要Refactor transformForestToMap
     */
    accountMap = BalanceSheetGenerator.calculatePercentageByOperatingRevenue(accountMap);
    return accountMap;
  }

  public override async generateFinancialReportArray(
    curPeriod: boolean
  ): Promise<IAccountForSheetDisplay[]> {
    const accountMap = await this.generateFinancialReportMap(curPeriod);

    return mappingAccountToSheetDisplay(accountMap, balanceSheetMapping);
  }

  static getAmount(account: IAccountReadyForFrontend) {
    const cur = DecimalCompatibility.decimalToNumber(
      DecimalOperations.abs(DecimalCompatibility.numberToDecimal(account.curPeriodAmount))
    );
    const pre = DecimalCompatibility.decimalToNumber(
      DecimalOperations.abs(DecimalCompatibility.numberToDecimal(account.prePeriodAmount))
    );

    return {
      cur,
      pre,
    };
  }

  static calculateAssetLiabilityRatio(asset: number, liability: number, equity: number) {
    const assetDecimal = DecimalCompatibility.numberToDecimal(asset);
    const liabilityDecimal = DecimalCompatibility.numberToDecimal(liability);
    const equityDecimal = DecimalCompatibility.numberToDecimal(equity);
    
    const total = DecimalOperations.add(
      DecimalOperations.add(assetDecimal, liabilityDecimal),
      equityDecimal
    );
    
    let assetPercentage = DecimalOperations.isZero(total) 
      ? 0 
      : Math.round(DecimalCompatibility.decimalToNumber(
          DecimalOperations.multiply(
            DecimalOperations.divide(assetDecimal, total),
            '100'
          )
        ));
        
    let liabilityPercentage = DecimalOperations.isZero(total)
      ? 0
      : Math.round(DecimalCompatibility.decimalToNumber(
          DecimalOperations.multiply(
            DecimalOperations.divide(liabilityDecimal, total),
            '100'
          )
        ));
        
    let equityPercentage = DecimalOperations.isZero(total)
      ? 0
      : Math.round(DecimalCompatibility.decimalToNumber(
          DecimalOperations.multiply(
            DecimalOperations.divide(equityDecimal, total),
            '100'
          )
        ));

    const surplus = 100 - (assetPercentage + liabilityPercentage + equityPercentage);

    const maxPercentage = Math.max(assetPercentage, liabilityPercentage, equityPercentage);

    // Info: (20240731 - Murky) 判斷哪一項是最大的，並將surplus加上去
    if (DecimalCompatibility.decimalToNumber(total) > 0 && surplus !== 0) {
      if (maxPercentage === assetPercentage) {
        assetPercentage += surplus;
      } else if (maxPercentage === liabilityPercentage) {
        liabilityPercentage += surplus;
      } else if (maxPercentage === equityPercentage) {
        equityPercentage += surplus;
      }
    }

    return {
      assetPercentage: assetPercentage.toString(),
      liabilityPercentage: liabilityPercentage.toString(),
      equityPercentage: equityPercentage.toString(),
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
    const curTop5Asset = asset.sort((a, b) => 
      DecimalCompatibility.decimalToNumber(
        DecimalOperations.subtract(
          DecimalCompatibility.numberToDecimal(b.curPeriodAmount),
          DecimalCompatibility.numberToDecimal(a.curPeriodAmount)
        )
      )
    ).slice(0, 5);
    const preTop5Asset = asset.sort((a, b) => 
      DecimalCompatibility.decimalToNumber(
        DecimalOperations.subtract(
          DecimalCompatibility.numberToDecimal(b.prePeriodAmount),
          DecimalCompatibility.numberToDecimal(a.prePeriodAmount)
        )
      )
    ).slice(0, 5);
    const curSurplus = DecimalOperations.subtract('100', curTop5Asset.reduce((acc, cur) => DecimalOperations.add(acc, cur.curPeriodPercentage), '0'));
    const preSurplus = DecimalOperations.subtract('100', preTop5Asset.reduce((acc, cur) => DecimalOperations.add(acc, cur.prePeriodPercentage), '0'));

    const curPercentage = curTop5Asset.map((account) => account.curPeriodPercentage);
    const curAssetName = curTop5Asset.map((account) => account.name);

    const prePercentage = preTop5Asset.map((account) => account.prePeriodPercentage);
    const preAssetName = preTop5Asset.map((account) => account.name);

    if (DecimalOperations.isPositive(curSurplus)) {
      curPercentage.push(curSurplus);
      curAssetName.push('其他');
    }

    if (DecimalOperations.isPositive(preSurplus)) {
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

    const salesCurrentAmount = DecimalCompatibility.numberToDecimal(salesTotal.curPeriodAmount);
    const receivableCurrentAmount = DecimalCompatibility.numberToDecimal(accountReceivable.curPeriodAmount);
    const salesPreviousAmount = DecimalCompatibility.numberToDecimal(salesTotal.prePeriodAmount);
    const receivablePreviousAmount = DecimalCompatibility.numberToDecimal(accountReceivable.prePeriodAmount);
    
    const curDso = DecimalOperations.abs(
      !DecimalOperations.isZero(salesCurrentAmount)
        ? Math.round(parseFloat(DecimalOperations.multiply(
            DecimalOperations.divide(receivableCurrentAmount, salesCurrentAmount),
            DAY_IN_YEAR.toString()
          ))).toString()
        : '0'
    );
    const preDso = DecimalOperations.abs(
      !DecimalOperations.isZero(salesPreviousAmount)
        ? Math.round(parseFloat(DecimalOperations.multiply(
            DecimalOperations.divide(receivablePreviousAmount, salesPreviousAmount),
            DAY_IN_YEAR.toString()
          ))).toString()
        : '0'
    );
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
    const operatingCostCurrentAmount = DecimalCompatibility.numberToDecimal(operatingCost.curPeriodAmount);
    const inventoryCurrentAmount = DecimalCompatibility.numberToDecimal(inventory.curPeriodAmount);
    const inventoryPreviousAmount = DecimalCompatibility.numberToDecimal(inventory.prePeriodAmount);
    
    const curInventoryTurnoverDays = DecimalOperations.abs(
      !DecimalOperations.isZero(operatingCostCurrentAmount)
        ? Math.round(parseFloat(DecimalOperations.multiply(
            DecimalOperations.divide(
              DecimalOperations.divide(
                DecimalOperations.add(inventoryCurrentAmount, inventoryPreviousAmount),
                '2'
              ),
              operatingCostCurrentAmount
            ),
            DAY_IN_YEAR.toString()
          ))).toString()
        : '0'
    );

    // Info: (20240729 - Murky) I need data of 2 two periods before, so this on can't be calculated
    const preInventoryTurnoverDays = '0';
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

  public override async generateReport(): Promise<{
    content: IFinancialReportInDB;
  }> {
    const balanceSheetContent = await this.generateIAccountReadyForFrontendArray();
    const incomeStatementContent =
      await this.incomeStatementGenerator.generateIAccountReadyForFrontendArray();
    const otherInfo = this.generateOtherInfo(balanceSheetContent, incomeStatementContent);
    const financialReportInDB = {
      content: balanceSheetContent,
      otherInfo,
    };

    return {
      content: financialReportInDB,
    };
  }
}
