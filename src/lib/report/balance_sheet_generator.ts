import { IVoucherLineUI } from "@/interfaces/voucher";
import { IBalanceSheet, IBalanceSheetItem } from "@/interfaces/balance_sheet";
import { MoneyUtil } from "@/lib/utils/money";
import { Decimal } from "decimal.js";

export function generateBalanceSheet(
  lineItems: IVoucherLineUI[],
  parValue: number = 10,
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
  let accountsReceivableTotal = MoneyUtil.toDecimal(0);
  let cashTotal = MoneyUtil.toDecimal(0);
  let fixedAssetsTotal = MoneyUtil.toDecimal(0);
  let interestBearingDebtTotal = MoneyUtil.toDecimal(0);
  let longTermFundsTotal = MoneyUtil.toDecimal(0);
  let intangibleAssetsTotal = MoneyUtil.toDecimal(0);
  let retainedEarningsTotal = MoneyUtil.toDecimal(0);
  let commonStockCapitalTotal = MoneyUtil.toDecimal(0);

  let currentPeriodEarnings = MoneyUtil.toDecimal(0);

  lineItems.forEach((line) => {
    // Info: (20260331 - Julian) 確保有會計科目且借貸方有值
    // Info: (20260504 - Tzuhan) ⚠️修復：修正 JS 運算子優先級陷阱 (!line.isDebit === null 會永遠為 false)
    const code = line.accountingCode || line.accounting?.code;
    if (!code || line.isDebit === null) return;

    const name = line.accounting?.name || line.particular || code;
    const { isDebit, amount } = line;

    const impact = isDebit
      ? MoneyUtil.toDecimal(amount)
      : MoneyUtil.toDecimal(amount).negated();

    // Info: (20260504 - Tzuhan) ⚠️修復：將本期損益科目(4~9)動態結轉到本期淨利，否則資產負債表永遠無法配平
    if (code.match(/^[456789]/)) {
      // Info: (20260512 - Tzuhan) 貸方(收益) impact為負 -> 淨利增加; 借方(費損) impact為正 -> 淨利減少
      currentPeriodEarnings = currentPeriodEarnings.minus(impact);
    }

    // Info: (20260331 - Julian) 根據標準臺灣會計編碼規則分組 (1: 資產, 2: 負債, 3: 權益)
    const isAsset = code.startsWith("1");
    const isLiability = code.startsWith("2");
    const isEquity = code.startsWith("3");

    // Info: (20260331 - Julian) 進一步細分「流動」與「非流動」資產
    const isCurrentAsset =
      isAsset &&
      (code.startsWith("11") ||
        code.startsWith("12") ||
        code.startsWith("13") ||
        code.startsWith("14"));
    const isCurrentLiability =
      isLiability &&
      (code.startsWith("21") || code.startsWith("22") || code.startsWith("23"));

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

      if (code.startsWith("110")) cashTotal = cashTotal.plus(impact); // Info: (20260513 - Tzuhan) 現金及約當現金
      if (code.startsWith("117"))
        accountsReceivableTotal = accountsReceivableTotal.plus(impact); // Info: (20260513 - Tzuhan) 應收帳款
      if (code.startsWith("13")) inventoryTotal = inventoryTotal.plus(impact); // Info: (20260513 - Tzuhan) 存貨
      if (code.startsWith("15") || code.startsWith("16")) {
        fixedAssetsTotal = fixedAssetsTotal.plus(impact); // Info: (20260513 - Tzuhan) 不動產、廠房及設備
      }
      if (
        code.startsWith("17") ||
        code.startsWith("18") ||
        code.startsWith("19")
      ) {
        if (code.startsWith("17"))
          intangibleAssetsTotal = intangibleAssetsTotal.plus(impact); // Info: (20260513 - Tzuhan) 無形資產
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

      // Info: (20260504 - Tzuhan) ⚠️修復：改由底層字典 (tw.ts 等) 的 isInterestBearing 標籤統一控管有息負債，實現資料與邏輯徹底解耦
      if (line.accounting?.isInterestBearing) {
        interestBearingDebtTotal = interestBearingDebtTotal.minus(impact);
      }
    } else if (isEquity) {
      // Info: (20260331 - Julian) 權益增加在貸方
      const currentAmount =
        equityMap.get(code)?.amount || MoneyUtil.toDecimal(0);
      equityMap.set(code, { name, amount: currentAmount.minus(impact) });
      totalEquity = totalEquity.minus(impact);

      // Info: (20260331 - Julian) 保留盈餘
      if (code.startsWith("33"))
        retainedEarningsTotal = retainedEarningsTotal.minus(impact);

      // Info: (20260408 - Luphia) 股本
      if (code.startsWith("31"))
        commonStockCapitalTotal = commonStockCapitalTotal.minus(impact);
    }
  });

  if (!currentPeriodEarnings.isZero()) {
    equityMap.set("3200", { name: "本期損益", amount: currentPeriodEarnings });
    totalEquity = totalEquity.plus(currentPeriodEarnings);
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

  // Info: (20260508 - Tzuhan) 已解耦，由外部傳入 parValue (因應彈性面額制度)
  const outstandingShares = commonStockCapitalTotal.dividedBy(parValue);

  // Info: (20260330 - Julian) 計算各項財務比率
  const metrics = {
    currentRatio: MoneyUtil.safeRatio(
      currentAssetsTotal,
      currentLiabilitiesTotal,
    ),
    quickRatio: MoneyUtil.safeRatio(
      currentAssetsTotal.minus(inventoryTotal),
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
      .toNumber(),
    cashRatio: MoneyUtil.safeRatio(cashTotal, currentLiabilitiesTotal),
    netWorthPerShare: outstandingShares.gt(0)
      ? totalEquity.dividedBy(outstandingShares).toNumber()
      : 0,
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
      ? 0
      : totalAssets.dividedBy(totalEquity).toNumber(),
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
