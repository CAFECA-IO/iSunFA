import { IVoucher } from "@/interfaces/voucher";
import { IBalanceSheet, IBalanceSheetItem } from "@/interfaces/balance_sheet";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";
import { safeDivide } from "@/lib/utils/math";

export function generateBalanceSheet(
  vouchers: IVoucher[],
  reportDateInfo: { period: string; currency: string }
): IBalanceSheet {
  const assetMap = new Map<string, { name: string; amount: number; isCurrent: boolean }>();
  const liabilityMap = new Map<string, { name: string; amount: number; isCurrent: boolean }>();
  const equityMap = new Map<string, { name: string; amount: number }>();

  // Info: (20260331 - Julian) 總計
  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;

  // Info: (20260331 - Julian) 「流動」與「非流動」總計
  let currentAssetsTotal = 0;
  let nonCurrentAssetsTotal = 0;
  let currentLiabilitiesTotal = 0;
  let nonCurrentLiabilitiesTotal = 0;

  // Info: (20260331 - Julian) 關鍵指標
  let inventoryTotal = 0;
  let accountsReceivableTotal = 0;
  let cashTotal = 0;
  let fixedAssetsTotal = 0;
  let interestBearingDebtTotal = 0;
  let longTermFundsTotal = 0;
  let intangibleAssetsTotal = 0;
  let retainedEarningsTotal = 0;

  // Info: (20260331 - Julian) 篩選「已核對」的傳票
  const verifyVouchers = vouchers.filter(
    (v) => !v.isDeleted && v.isVerified && v.analysisStatus === AIAnalysisStatus.COMPLETED
  );

  verifyVouchers.forEach((voucher) => {
    voucher.lineItems.lines.forEach((line) => {
      // Info: (20260331 - Julian) 確保有會計科目且借貸方有值
      if (!line.accounting || !line.isDebit === null) return;
      
      // Info: (20260331 - Julian) 解構
      const { accounting: { code, name }, isDebit, amount } = line;

      // Info: (20260331 - Julian) 根據標準臺灣會計編碼規則分組 (1: 資產, 2: 負債, 3: 權益)
      const isAsset = code.startsWith('1');
      const isLiability = code.startsWith('2');
      const isEquity = code.startsWith('3');

      // Info: (20260331 - Julian) 進一步細分「流動」與「非流動」資產
      const isCurrentAsset = isAsset && (code.startsWith('11') || code.startsWith('12') || code.startsWith('13') || code.startsWith('14'));
      const isCurrentLiability = isLiability && (code.startsWith('21') || code.startsWith('22'));
      
      // Info: (20260331 - Julian) 借貸方向
      const impact = isDebit ? amount : -amount;

      if (isAsset) {
        // Info: (20260331 - Julian) ========= 資產增加在借方 =========
        const currentAmount = assetMap.get(code)?.amount || 0;
        assetMap.set(code, { name, amount: currentAmount + impact, isCurrent: isCurrentAsset });
        totalAssets += impact;

        if (code.startsWith('110')) cashTotal += impact; // Info: (20260330 - Julian) 現金及約當現金
        if (code.startsWith('117')) accountsReceivableTotal += impact; // Info: (20260330 - Julian) 應收帳款
        if (code.startsWith('13')) inventoryTotal += impact; // Info: (20260330 - Julian) 存貨
        if (code.startsWith('15') || code.startsWith('16')) fixedAssetsTotal += impact; // Info: (20260330 - Julian) 不動產、廠房及設備
        if (code.startsWith('17') || code.startsWith('18') || code.startsWith('19')) {
           if (name.includes('無形資產')) intangibleAssetsTotal += impact; // Info: (20260330 - Julian) 無形資產
        }

      } else if (isLiability) {
        // Info: (20260331 - Julian) ========= 負債增加在貸方 =========
        const currentAmount = liabilityMap.get(code)?.amount || 0;
        liabilityMap.set(code, { name, amount: currentAmount - impact, isCurrent: isCurrentLiability });
        totalLiabilities -= impact;

        // Info: (20260331 - Julian) 粗略估計有息負債 (短期及長期借款)
        if (code.startsWith('212') || code.startsWith('253') || name.includes('借款') || name.includes('公司債')) {
          interestBearingDebtTotal -= impact;
        }

      } else if (isEquity) {
        // Info: (20260331 - Julian) ========= 權益增加在貸方 ========= 
        const currentAmount = equityMap.get(code)?.amount || 0;
        equityMap.set(code, { name, amount: currentAmount - impact });
        totalEquity -= impact;
        
        // Info: (20260331 - Julian) 保留盈餘
        if (code.startsWith('33')) retainedEarningsTotal -= impact; 
      }
    });
  });

  // Info: (20260331 - Julian) 轉換 Map 為 IBalanceSheetItem[]
  const mapToArray = (
    map: Map<string, { name: string; amount: number; isCurrent?: boolean }>, 
    baseTotal: number,
    filterFn?: (item: { isCurrent?: boolean }) => boolean
  ): IBalanceSheetItem[] => {
    return Array.from(map.entries())
      .map(([code, data]) => ({
        code,
        name: data.name,
        amount: data.amount,
        percentageOfAssetOrLiabEquity: baseTotal !== 0 ? (data.amount / baseTotal) * 100 : 0,
        isCurrent: data.isCurrent
      }))
      .filter(filterFn ? filterFn : () => true)
      .sort((a, b) => a.code.localeCompare(b.code))
      .map(({ code, name, amount, percentageOfAssetOrLiabEquity }) => ({ code, name, amount, percentageOfAssetOrLiabEquity }));
  };

  // Info: (20260331 - Julian) 整理資產、負債、權益數據
  const currentAssetsItems = mapToArray(assetMap, totalAssets, (item) => item.isCurrent === true);
  const nonCurrentAssetsItems = mapToArray(assetMap, totalAssets, (item) => item.isCurrent === false);
  const currentLiabilitiesItems = mapToArray(liabilityMap, totalLiabilities + totalEquity, (item) => item.isCurrent === true);
  const nonCurrentLiabilitiesItems = mapToArray(liabilityMap, totalLiabilities + totalEquity, (item) => item.isCurrent === false);
  const equityItems = mapToArray(equityMap, totalLiabilities + totalEquity);

  // Info: (20260331 - Julian) 計算各項總計
  currentAssetsTotal = currentAssetsItems.reduce((acc, curr) => acc + curr.amount, 0);
  nonCurrentAssetsTotal = nonCurrentAssetsItems.reduce((acc, curr) => acc + curr.amount, 0);
  currentLiabilitiesTotal = currentLiabilitiesItems.reduce((acc, curr) => acc + curr.amount, 0);
  nonCurrentLiabilitiesTotal = nonCurrentLiabilitiesItems.reduce((acc, curr) => acc + curr.amount, 0);
  longTermFundsTotal = totalEquity + nonCurrentLiabilitiesTotal;

  // Info: (20260330 - Julian) 計算各項財務比率
  const metrics = {
    currentRatio: safeDivide(currentAssetsTotal, currentLiabilitiesTotal) * 100,
    quickRatio: safeDivide(currentAssetsTotal - inventoryTotal, currentLiabilitiesTotal) * 100,
    debtRatio: safeDivide(totalLiabilities, totalAssets) * 100,
    debtToEquityRatio: safeDivide(totalLiabilities, totalEquity) * 100,
    longTermFundsToFixedAssetsRatio: safeDivide(longTermFundsTotal, fixedAssetsTotal) * 100,
    workingCapital: currentAssetsTotal - currentLiabilitiesTotal,
    cashRatio: safeDivide(cashTotal, currentLiabilitiesTotal) * 100,
    netWorthPerShare: 0, // TODO: (20260330 - Julian) 外部資料，目前預設為 0
    retainedEarningsRatio: safeDivide(retainedEarningsTotal, totalEquity) * 100,
    intangibleAssetsRatio: safeDivide(intangibleAssetsTotal, totalAssets) * 100,
    equityRatio: safeDivide(totalEquity, totalAssets) * 100,
    equityMultiplier: safeDivide(totalAssets, totalEquity),
    interestBearingDebtRatio: safeDivide(interestBearingDebtTotal, totalAssets) * 100,
    inventoryToCurrentAssetsRatio: safeDivide(inventoryTotal, currentAssetsTotal) * 100,
    arToTotalAssetsRatio: safeDivide(accountsReceivableTotal, totalAssets) * 100,
    fixedAssetsToEquityRatio: safeDivide(fixedAssetsTotal, totalEquity) * 100,
  };

  return {
    reportPeriod: reportDateInfo.period,
    currency: reportDateInfo.currency,
    assets: {
      current: { items: currentAssetsItems, total: currentAssetsTotal },
      nonCurrent: { items: nonCurrentAssetsItems, total: nonCurrentAssetsTotal },
      total: totalAssets,
    },
    liabilities: {
      current: { items: currentLiabilitiesItems, total: currentLiabilitiesTotal },
      nonCurrent: { items: nonCurrentLiabilitiesItems, total: nonCurrentLiabilitiesTotal },
      total: totalLiabilities,
    },
    equity: {
      items: equityItems,
      total: totalEquity,
    },
    metrics,
  };
}
