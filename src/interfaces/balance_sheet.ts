export interface IBalanceSheetItem {
  code: string;
  name: string;
  amount: string | number;
  percentageOfAssetOrLiabEquity: number;
}

export interface IBalanceSheetMetrics {
  currentRatio: number; // Info: (20260330 - Julian) 流動比率 %
  quickRatio: number; // Info: (20260330 - Julian) 速動比率 %
  debtRatio: number; // Info: (20260330 - Julian) 負債比率 %
  debtToEquityRatio: number; // Info: (20260330 - Julian) 負債權益比 %
  longTermFundsToFixedAssetsRatio: number; // Info: (20260330 - Julian) 長期資金占固定資產比率 %
  workingCapital: number; // Info: (20260330 - Julian) 營運資金
  cashRatio: number; // Info: (20260330 - Julian) 現金比率 %
  netWorthPerShare: number; // Info: (20260330 - Julian) 每股淨值 (requires outstanding shares, assuming predefined or omitted if not avail)
  parValue: number; // Info: (20260508 - Tzuhan) 面額
  retainedEarningsRatio: number; // Info: (20260330 - Julian) 保留盈餘佔比 %
  intangibleAssetsRatio: number; // Info: (20260330 - Julian) 無形資產佔比 %
  // Info: (20260330 - Julian) 新建議的財務比率：
  equityRatio: number; // Info: (20260330 - Julian) 業主權益比率 %
  equityMultiplier: number; // Info: (20260330 - Julian) 權益乘數
  interestBearingDebtRatio: number; // Info: (20260330 - Julian) 有息負債比率 %
  inventoryToCurrentAssetsRatio: number; // Info: (20260330 - Julian) 存貨佔流動資產比率
  arToTotalAssetsRatio: number; // Info: (20260330 - Julian) 應收帳款佔總資產比率
  fixedAssetsToEquityRatio: number; // Info: (20260330 - Julian) 固定資產對權益比率

  // Info: (20260518 - Tzuhan) [AUDIT FIX] 補充揭露：供跨表指標 (如現金再投資比率) 計算使用之絕對數值
  fixedAssetsTotal?: number; // Info: (20260518 - Tzuhan) 固定資產總額
  longTermInvestmentsTotal?: number; // Info: (20260518 - Tzuhan) 長期投資總額
  otherAssetsTotal?: number; // Info: (20260518 - Tzuhan) 其他資產總額
}

export interface IBalanceSheet {
  assets: {
    current: { items: IBalanceSheetItem[]; total: string | number };
    nonCurrent: { items: IBalanceSheetItem[]; total: string | number };
    total: string | number;
  };
  liabilities: {
    current: { items: IBalanceSheetItem[]; total: string | number };
    nonCurrent: { items: IBalanceSheetItem[]; total: string | number };
    total: string | number;
  };
  equity: {
    items: IBalanceSheetItem[];
    total: string | number;
  };
  metrics: IBalanceSheetMetrics;
}
