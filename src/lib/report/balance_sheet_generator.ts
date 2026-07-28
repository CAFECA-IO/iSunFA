import { IVoucherLineUI } from "@/interfaces/voucher";
import { IBalanceSheet, IBalanceSheetItem } from "@/interfaces/balance_sheet";
import { MoneyUtil } from "@/lib/utils/money";
import { Decimal } from "decimal.js";
import { TW_ACCOUNTS } from "@/constants/accounts/tw";
import { AccountUtil } from "@/lib/utils/account_util";
import { SystemAccountNodes } from "@/constants/system_account_codes";
import { DataIntegrityError } from "@/lib/report/report_errors";

export function generateBalanceSheet(
  lineItems: IVoucherLineUI[],
  parValue: number = 10,
  previousPeriodSnapshot?: IBalanceSheet,
): IBalanceSheet {
  const assetMap = new Map<
    string,
    { name: string; amount: Decimal; isCurrent: boolean }
  >();
  const liabilityMap = new Map<
    string,
    { name: string; amount: Decimal; isCurrent: boolean }
  >();
  const equityMap = new Map<string, { name: string; amount: Decimal }>();

  // Info: (20260331 - Julian) 總計
  let totalAssets = MoneyUtil.toDecimal(0);
  let totalLiabilities = MoneyUtil.toDecimal(0);
  let totalEquity = MoneyUtil.toDecimal(0);

  // Info: (20260331 - Julian) 「流動」與「非流動」總計
  let currentAssetsTotal = MoneyUtil.toDecimal(0);
  let nonCurrentAssetsTotal = MoneyUtil.toDecimal(0);
  let currentLiabilitiesTotal = MoneyUtil.toDecimal(0);
  let nonCurrentLiabilitiesTotal = MoneyUtil.toDecimal(0);

  // Info: (20260331 - Julian) 關鍵指標
  let inventoryTotal = MoneyUtil.toDecimal(0);
  let prepaymentsTotal = MoneyUtil.toDecimal(0);
  let accountsReceivableTotal = MoneyUtil.toDecimal(0);
  let cashTotal = MoneyUtil.toDecimal(0);
  let fixedAssetsTotal = MoneyUtil.toDecimal(0);
  let interestBearingDebtTotal = MoneyUtil.toDecimal(0);
  let longTermFundsTotal = MoneyUtil.toDecimal(0);
  let intangibleAssetsTotal = MoneyUtil.toDecimal(0);
  let retainedEarningsTotal = MoneyUtil.toDecimal(0);
  let commonStockCapitalTotal = MoneyUtil.toDecimal(0);
  let currentPeriodEarnings = MoneyUtil.toDecimal(0);
  // Info: (20260518 - Tzuhan) 新增追蹤長期投資與其他資產
  let longTermInvestmentsTotal = MoneyUtil.toDecimal(0);
  let otherAssetsTotal = MoneyUtil.toDecimal(0);

  // Info: (20260525 - Tzuhan) [IAS 1 FIX] 期初餘額快照繼承 (Snapshot Inheritance)
  if (previousPeriodSnapshot) {
    const processSnapshotItems = (
      items: IBalanceSheetItem[],
      map: Map<
        string,
        | { name: string; amount: Decimal; isCurrent: boolean }
        | { name: string; amount: Decimal }
      >,
      isCurrentFunc?: (code: string) => boolean,
    ) => {
      items.forEach((item) => {
        if (isCurrentFunc) {
          map.set(item.code, {
            name: item.name,
            amount: MoneyUtil.toDecimal(item.amount),
            isCurrent: isCurrentFunc(item.code),
          });
        } else {
          map.set(item.code, {
            name: item.name,
            amount: MoneyUtil.toDecimal(item.amount),
          });
        }
      });
    };

    processSnapshotItems(
      previousPeriodSnapshot.assets.current.items,
      assetMap,
      () => true,
    );
    processSnapshotItems(
      previousPeriodSnapshot.assets.nonCurrent.items,
      assetMap,
      () => false,
    );
    processSnapshotItems(
      previousPeriodSnapshot.liabilities.current.items,
      liabilityMap,
      () => true,
    );
    processSnapshotItems(
      previousPeriodSnapshot.liabilities.nonCurrent.items,
      liabilityMap,
      () => false,
    );
    processSnapshotItems(previousPeriodSnapshot.equity.items, equityMap);
  }

  lineItems.forEach((line) => {
    // Info: (20260331 - Julian) 確保有會計科目且借貸方有值
    // Info: (20260504 - Tzuhan) ⚠️修復：修正 JS 運算子優先級陷阱 (!line.isDebit === null 會永遠為 false)
    const code = line.accountingCode || line.accounting?.code;

    // Info: (20260518 - Tzuhan) [AUDIT FIX] 拔除沉默丟失，改為 CPA 級別阻斷防護
    if (!code || line.isDebit === null) {
      throw new DataIntegrityError(
        `[Data Integrity Violation] 發現無法勾稽的傳票明細，缺乏會計代碼或借貸方向 (Line ID: ${line.id})`,
      );
    }

    const name = line.accounting?.name || line.particular || code;
    const { isDebit, amount } = line;

    const impact = isDebit
      ? MoneyUtil.toDecimal(amount)
      : MoneyUtil.toDecimal(amount).negated();

    // Info: (20260520 - Tzuhan) [REFACTOR] 徹底拔除 Regex，改由樹狀溯源動態結轉本期損益
    const isIncomeOrExpense =
      AccountUtil.isDescendantOf(
        code,
        SystemAccountNodes.INCOME_ROOT,
        TW_ACCOUNTS,
      ) ||
      AccountUtil.isDescendantOf(
        code,
        SystemAccountNodes.COST_ROOT,
        TW_ACCOUNTS,
      ) ||
      AccountUtil.isDescendantOf(
        code,
        SystemAccountNodes.EXPENSE_ROOT,
        TW_ACCOUNTS,
      ) ||
      AccountUtil.isDescendantOf(
        code,
        SystemAccountNodes.NON_OP_INCOME_ROOT,
        TW_ACCOUNTS,
      ) ||
      AccountUtil.isDescendantOf(
        code,
        SystemAccountNodes.OTHER_COMPREHENSIVE_INCOME_ROOT,
        TW_ACCOUNTS,
      ) ||
      AccountUtil.isDescendantOf(
        code,
        SystemAccountNodes.TAX_EXPENSE_ROOT,
        TW_ACCOUNTS,
      );

    if (isIncomeOrExpense) {
      // Info: (20260512 - Tzuhan) 貸方(收益) impact為負 -> 淨利增加; 借方(費損) impact為正 -> 淨利減少
      currentPeriodEarnings = currentPeriodEarnings.minus(impact);
    }

    // Info: (20260520 - Tzuhan) [REFACTOR] 導入資料驅動樹狀結構，完全拔除 Magic String
    const isAsset = AccountUtil.isDescendantOf(
      code,
      SystemAccountNodes.ASSETS_ROOT,
      TW_ACCOUNTS,
    );
    const isLiability = AccountUtil.isDescendantOf(
      code,
      SystemAccountNodes.LIABILITIES_ROOT,
      TW_ACCOUNTS,
    );
    const isEquity = AccountUtil.isDescendantOf(
      code,
      SystemAccountNodes.EQUITY_ROOT,
      TW_ACCOUNTS,
    );

    const isCurrentAsset = AccountUtil.isDescendantOf(
      code,
      SystemAccountNodes.CURRENT_ASSETS_ROOT,
      TW_ACCOUNTS,
    );
    const isCurrentLiability = AccountUtil.isDescendantOf(
      code,
      SystemAccountNodes.CURRENT_LIABILITIES_ROOT,
      TW_ACCOUNTS,
    );

    // Info: (20260331 - Julian) 借貸方向

    if (isAsset) {
      // Info: (20260331 - Julian) 資產增加在借方
      const currentAmount =
        assetMap.get(code)?.amount || MoneyUtil.toDecimal(0);
      assetMap.set(code, {
        name,
        amount: currentAmount.plus(impact),
        isCurrent: isCurrentAsset,
      });
      totalAssets = totalAssets.plus(impact);

      // Info: (20260520 - Tzuhan) [REFACTOR] 樹狀溯源取代 startsWith (使用 SystemAccountNodes)
      if (
        AccountUtil.isDescendantOf(
          code,
          SystemAccountNodes.CASH_ROOT,
          TW_ACCOUNTS,
        )
      ) {
        cashTotal = cashTotal.plus(impact);
      } else if (
        AccountUtil.isDescendantOf(
          code,
          SystemAccountNodes.ACCOUNTS_RECEIVABLE_ROOT,
          TW_ACCOUNTS,
        )
      ) {
        accountsReceivableTotal = accountsReceivableTotal.plus(impact);
      } else if (
        AccountUtil.isDescendantOf(
          code,
          SystemAccountNodes.INVENTORY_ROOT,
          TW_ACCOUNTS,
        )
      ) {
        inventoryTotal = inventoryTotal.plus(impact);
      } else if (
        AccountUtil.isDescendantOf(
          code,
          SystemAccountNodes.PREPAYMENTS_ROOT,
          TW_ACCOUNTS,
        )
      ) {
        prepaymentsTotal = prepaymentsTotal.plus(impact);
      } else if (
        AccountUtil.isDescendantOf(
          code,
          SystemAccountNodes.FIXED_ASSETS_ROOT,
          TW_ACCOUNTS,
        )
      ) {
        fixedAssetsTotal = fixedAssetsTotal.plus(impact);
      } else if (
        AccountUtil.isDescendantOf(
          code,
          SystemAccountNodes.INTANGIBLE_ASSETS_ROOT,
          TW_ACCOUNTS,
        )
      ) {
        intangibleAssetsTotal = intangibleAssetsTotal.plus(impact);
      } else if (
        AccountUtil.isDescendantOf(
          code,
          SystemAccountNodes.OTHER_ASSETS_ROOT,
          TW_ACCOUNTS,
        )
      ) {
        otherAssetsTotal = otherAssetsTotal.plus(impact);
      } else if (
        AccountUtil.isDescendantOf(
          code,
          SystemAccountNodes.NON_CURRENT_ASSETS_ROOT,
          TW_ACCOUNTS,
        )
      ) {
        // Info: (20260520 - Tzuhan) [REFACTOR] 如果是非流動資產，但不是上述(固定、無形、其他)，則歸類為長期投資
        longTermInvestmentsTotal = longTermInvestmentsTotal.plus(impact);
      }
    } else if (isLiability) {
      // Info: (20260331 - Julian) 負債增加在貸方
      const currentAmount =
        liabilityMap.get(code)?.amount || MoneyUtil.toDecimal(0);
      liabilityMap.set(code, {
        name,
        amount: currentAmount.minus(impact),
        isCurrent: isCurrentLiability,
      });
      totalLiabilities = totalLiabilities.minus(impact);

      // Info: (20260504 - Tzuhan) 改由底層字典的 isInterestBearing 標籤統一控管有息負債
      if (line.accounting?.isInterestBearing) {
        interestBearingDebtTotal = interestBearingDebtTotal.minus(impact);
      }
    } else if (isEquity) {
      // Info: (20260331 - Julian) 權益增加在貸方
      const currentAmount =
        equityMap.get(code)?.amount || MoneyUtil.toDecimal(0);
      equityMap.set(code, { name, amount: currentAmount.minus(impact) });
      totalEquity = totalEquity.minus(impact);

      // Info: (20260520 - Tzuhan) [REFACTOR] 樹狀溯源取代 startsWith
      if (
        AccountUtil.isDescendantOf(
          code,
          SystemAccountNodes.RETAINED_EARNINGS_ROOT,
          TW_ACCOUNTS,
        )
      ) {
        retainedEarningsTotal = retainedEarningsTotal.minus(impact);
      } else if (
        AccountUtil.isDescendantOf(
          code,
          SystemAccountNodes.COMMON_STOCK_ROOT,
          TW_ACCOUNTS,
        )
      ) {
        commonStockCapitalTotal = commonStockCapitalTotal.minus(impact);
      }
    }
  });

  if (!currentPeriodEarnings.isZero()) {
    // Info: (20260520 - Tzuhan) [AUDIT FIX] 防禦靜默覆寫：若已有結轉傳票，必須累加而非直接 set
    const cpEarningsCode = SystemAccountNodes.CURRENT_PERIOD_EARNINGS;
    const existingCPE =
      equityMap.get(cpEarningsCode)?.amount || MoneyUtil.toDecimal(0);
    equityMap.set(cpEarningsCode, {
      name: "本期損益",
      amount: existingCPE.plus(currentPeriodEarnings),
    });

    totalEquity = totalEquity.plus(currentPeriodEarnings);
    // Info: (20260518 - Tzuhan) [AUDIT FIX] 將本期損益滾入保留盈餘總計，確保 retainedEarningsRatio 精準
    retainedEarningsTotal = retainedEarningsTotal.plus(currentPeriodEarnings);
  }

  // Info: (20260331 - Julian) 轉換 Map 為 IBalanceSheetItem[]
  const mapToArray = (
    map: Map<string, { name: string; amount: Decimal; isCurrent?: boolean }>,
    baseTotal: Decimal,
    filterFn?: (item: { isCurrent?: boolean }) => boolean,
  ): IBalanceSheetItem[] => {
    return Array.from(map.entries())
      .map(([code, data]) => ({
        code,
        name: data.name,
        amount: data.amount.toString(),
        percentageOfAssetOrLiabEquity: MoneyUtil.safeRatio(
          data.amount,
          baseTotal,
        ),
        isCurrent: data.isCurrent,
      }))
      .filter(filterFn ? filterFn : () => true)
      .sort((a, b) => a.code.localeCompare(b.code))
      .map(({ code, name, amount, percentageOfAssetOrLiabEquity }) => ({
        code,
        name,
        amount,
        percentageOfAssetOrLiabEquity,
      }));
  };

  // Info: (20260331 - Julian) 整理資產、負債、權益數據
  const currentAssetsItems = mapToArray(
    assetMap,
    totalAssets,
    (item) => item.isCurrent === true,
  );
  const nonCurrentAssetsItems = mapToArray(
    assetMap,
    totalAssets,
    (item) => item.isCurrent === false,
  );

  const totalLiabAndEq = totalLiabilities.plus(totalEquity);

  const currentLiabilitiesItems = mapToArray(
    liabilityMap,
    totalLiabAndEq,
    (item) => item.isCurrent === true,
  );
  const nonCurrentLiabilitiesItems = mapToArray(
    liabilityMap,
    totalLiabAndEq,
    (item) => item.isCurrent === false,
  );
  const equityItems = mapToArray(equityMap, totalLiabAndEq);

  // Info: (20260331 - Julian) 計算各項總計
  currentAssetsTotal = currentAssetsItems.reduce(
    (acc, curr) => acc.plus(MoneyUtil.toDecimal(curr.amount)),
    MoneyUtil.toDecimal(0),
  );
  nonCurrentAssetsTotal = nonCurrentAssetsItems.reduce(
    (acc, curr) => acc.plus(MoneyUtil.toDecimal(curr.amount)),
    MoneyUtil.toDecimal(0),
  );
  currentLiabilitiesTotal = currentLiabilitiesItems.reduce(
    (acc, curr) => acc.plus(MoneyUtil.toDecimal(curr.amount)),
    MoneyUtil.toDecimal(0),
  );
  nonCurrentLiabilitiesTotal = nonCurrentLiabilitiesItems.reduce(
    (acc, curr) => acc.plus(MoneyUtil.toDecimal(curr.amount)),
    MoneyUtil.toDecimal(0),
  );
  longTermFundsTotal = totalEquity.plus(nonCurrentLiabilitiesTotal);

  // Info: (20260508 - Tzuhan) 已解耦，由外部傳入 parValue (因應彈性面額制度與無面額股防禦)
  // Info: (20260518 - Tzuhan) [AUDIT FIX] 增加對 parValue <= 0 (無面額股) 的防禦，避免 Decimal 拋出 Division by zero 崩潰
  const outstandingShares =
    parValue > 0
      ? commonStockCapitalTotal.dividedBy(parValue)
      : MoneyUtil.toDecimal(0);

  // Info: (20260330 - Julian) 計算各項財務比率
  const metrics = {
    currentRatio: MoneyUtil.safeRatio(
      currentAssetsTotal,
      currentLiabilitiesTotal,
    ),
    quickRatio: MoneyUtil.safeRatio(
      currentAssetsTotal.minus(inventoryTotal).minus(prepaymentsTotal),
      currentLiabilitiesTotal,
    ),
    debtRatio: MoneyUtil.safeRatio(totalLiabilities, totalAssets),
    debtToEquityRatio: MoneyUtil.safeRatio(totalLiabilities, totalEquity),
    longTermFundsToFixedAssetsRatio: MoneyUtil.safeRatio(
      longTermFundsTotal,
      fixedAssetsTotal,
    ),
    workingCapital: currentAssetsTotal
      .minus(currentLiabilitiesTotal)
      .toString(),
    cashRatio: MoneyUtil.safeRatio(cashTotal, currentLiabilitiesTotal),
    netWorthPerShare: outstandingShares.gt(0)
      ? totalEquity.dividedBy(outstandingShares).toString()
      : "0",
    parValue,
    retainedEarningsRatio: MoneyUtil.safeRatio(
      retainedEarningsTotal,
      totalEquity,
    ),
    intangibleAssetsRatio: MoneyUtil.safeRatio(
      intangibleAssetsTotal,
      totalAssets,
    ),
    equityRatio: MoneyUtil.safeRatio(totalEquity, totalAssets),
    equityMultiplier: totalEquity.isZero()
      ? "0"
      : totalAssets.dividedBy(totalEquity).toString(),
    interestBearingDebtRatio: MoneyUtil.safeRatio(
      interestBearingDebtTotal,
      totalAssets,
    ),
    inventoryToCurrentAssetsRatio: MoneyUtil.safeRatio(
      inventoryTotal,
      currentAssetsTotal,
    ),
    arToTotalAssetsRatio: MoneyUtil.safeRatio(
      accountsReceivableTotal,
      totalAssets,
    ),
    fixedAssetsToEquityRatio: MoneyUtil.safeRatio(
      fixedAssetsTotal,
      totalEquity,
    ),
    // Info: (20260518 - Tzuhan) [AUDIT FIX] 將跨表指標所需之絕對數值精準輸出
    fixedAssetsTotal: fixedAssetsTotal.toString(),
    longTermInvestmentsTotal: longTermInvestmentsTotal.toString(),
    otherAssetsTotal: otherAssetsTotal.toString(),
  };

  return {
    assets: {
      current: {
        items: currentAssetsItems,
        total: currentAssetsTotal.toString(),
      },
      nonCurrent: {
        items: nonCurrentAssetsItems,
        total: nonCurrentAssetsTotal.toString(),
      },
      total: totalAssets.toString(),
    },
    liabilities: {
      current: {
        items: currentLiabilitiesItems,
        total: currentLiabilitiesTotal.toString(),
      },
      nonCurrent: {
        items: nonCurrentLiabilitiesItems,
        total: nonCurrentLiabilitiesTotal.toString(),
      },
      total: totalLiabilities.toString(),
    },
    equity: {
      items: equityItems,
      total: totalEquity.toString(),
    },
    metrics,
  };
}
