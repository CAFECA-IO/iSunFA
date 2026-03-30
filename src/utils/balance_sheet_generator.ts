import { IVoucher } from "@/interfaces/voucher";
import { IBalanceSheet, IBalanceSheetItem } from "@/interfaces/balance_sheet";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";

export function generateBalanceSheet(
  vouchers: IVoucher[],
  reportDateInfo: { period: string; currency: string }
): IBalanceSheet {
  const assetMap = new Map<string, { name: string; amount: number; isCurrent: boolean }>();
  const liabilityMap = new Map<string, { name: string; amount: number; isCurrent: boolean }>();
  const equityMap = new Map<string, { name: string; amount: number }>();

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;

  let currentAssetsTotal = 0;
  let nonCurrentAssetsTotal = 0;
  let currentLiabilitiesTotal = 0;
  let nonCurrentLiabilitiesTotal = 0;

  // Info: (20260330 - Julian) 關鍵指標計算所需變數
  let inventoryTotal = 0;
  let accountsReceivableTotal = 0;
  let cashTotal = 0;
  let fixedAssetsTotal = 0;
  let interestBearingDebtTotal = 0;
  let longTermFundsTotal = 0;
  let intangibleAssetsTotal = 0;
  let retainedEarningsTotal = 0;

  // Info: (20260330 - Julian) 篩選有效的傳票
  const validVouchers = vouchers.filter(
    (v) => !v.isDeleted && v.isVerified && v.analysisStatus === AIAnalysisStatus.COMPLETED
  );

  validVouchers.forEach((voucher) => {
    voucher.lineItems.lines.forEach((line) => {
      if (!line.accounting || !line.isDebit === null) return;
      
      const code = line.accounting.code;
      const isDebit = line.isDebit;
      const amount = line.amount;
      const name = line.accounting.name;

      // Info: (20260330 - Julian) 根據標準臺灣會計編碼規則分組 (1: 資產, 2: 負債, 3: 權益)
      const isAsset = code.startsWith('1');
      const isLiability = code.startsWith('2');
      const isEquity = code.startsWith('3');

      // Info: (20260330 - Julian) 流動與非流動資產的進一步細分
      const isCurrentAsset = isAsset && (code.startsWith('11') || code.startsWith('12') || code.startsWith('13') || code.startsWith('14'));
      const isCurrentLiability = isLiability && (code.startsWith('21') || code.startsWith('22'));
      
      const impact = isDebit ? amount : -amount;

      if (isAsset) {
        // Info: (20260330 - Julian) 資產增加在借方
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
        // Info: (20260330 - Julian) 負債增加在貸方 (透過借方邏輯產生負面影響 => 所以反轉它)
        const currentAmount = liabilityMap.get(code)?.amount || 0;
        liabilityMap.set(code, { name, amount: currentAmount - impact, isCurrent: isCurrentLiability });
        totalLiabilities -= impact;

        // Info: (20260330 - Julian) 粗略估計有息負債 (短期及長期借款)
        if (code.startsWith('212') || code.startsWith('253') || name.includes('借款') || name.includes('公司債')) {
          interestBearingDebtTotal -= impact;
        }

      } else if (isEquity) {
        // Info: (20260330 - Julian) 權益增加在貸方
        const currentAmount = equityMap.get(code)?.amount || 0;
        equityMap.set(code, { name, amount: currentAmount - impact });
        totalEquity -= impact;
        
        if (code.startsWith('33')) retainedEarningsTotal -= impact; // Info: (20260330 - Julian) 保留盈餘
      }
    });
  });

  // Info: (20260330 - Julian) 將 Map 轉換為排序後的陣列
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

  const currentAssetsItems = mapToArray(assetMap, totalAssets, (item) => item.isCurrent === true);
  const nonCurrentAssetsItems = mapToArray(assetMap, totalAssets, (item) => item.isCurrent === false);
  const currentLiabilitiesItems = mapToArray(liabilityMap, totalLiabilities + totalEquity, (item) => item.isCurrent === true);
  const nonCurrentLiabilitiesItems = mapToArray(liabilityMap, totalLiabilities + totalEquity, (item) => item.isCurrent === false);
  const equityItems = mapToArray(equityMap, totalLiabilities + totalEquity);

  currentAssetsTotal = currentAssetsItems.reduce((acc, curr) => acc + curr.amount, 0);
  nonCurrentAssetsTotal = nonCurrentAssetsItems.reduce((acc, curr) => acc + curr.amount, 0);
  currentLiabilitiesTotal = currentLiabilitiesItems.reduce((acc, curr) => acc + curr.amount, 0);
  nonCurrentLiabilitiesTotal = nonCurrentLiabilitiesItems.reduce((acc, curr) => acc + curr.amount, 0);
  
  longTermFundsTotal = totalEquity + nonCurrentLiabilitiesTotal;

  // Info: (20260330 - Julian) 安全除法：避免除以 0
  const safeDivide = (num: number, den: number) => (den === 0 ? 0 : num / den);

  // Info: (20260330 - Julian) 計算各項財務比率
  const metrics = {
    currentRatio: safeDivide(currentAssetsTotal, currentLiabilitiesTotal) * 100,
    quickRatio: safeDivide(currentAssetsTotal - inventoryTotal, currentLiabilitiesTotal) * 100,
    debtRatio: safeDivide(totalLiabilities, totalAssets) * 100,
    debtToEquityRatio: safeDivide(totalLiabilities, totalEquity) * 100,
    longTermFundsToFixedAssetsRatio: safeDivide(longTermFundsTotal, fixedAssetsTotal) * 100,
    workingCapital: currentAssetsTotal - currentLiabilitiesTotal,
    cashRatio: safeDivide(cashTotal, currentLiabilitiesTotal) * 100,
    netWorthPerShare: 0, // Info: (20260330 - Julian) 外部資料，目前預設為 0
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
