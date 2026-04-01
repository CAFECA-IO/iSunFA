export interface IBalanceSheetItem {
  code: string;
  name: string;
  amount: number;
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
  retainedEarningsRatio: number; // Info: (20260330 - Julian) 保留盈餘佔比 %
  intangibleAssetsRatio: number; // Info: (20260330 - Julian) 無形資產佔比 %
  // Info: (20260330 - Julian) 新建議的財務比率：
  equityRatio: number; // Info: (20260330 - Julian) 業主權益比率 %
  equityMultiplier: number; // Info: (20260330 - Julian) 權益乘數
  interestBearingDebtRatio: number; // Info: (20260330 - Julian) 有息負債比率 %
  inventoryToCurrentAssetsRatio: number; // Info: (20260330 - Julian) 存貨佔流動資產比率
  arToTotalAssetsRatio: number; // Info: (20260330 - Julian) 應收帳款佔總資產比率
  fixedAssetsToEquityRatio: number; // Info: (20260330 - Julian) 固定資產對權益比率
}

export interface IBalanceSheet {
  assets: {
    current: { items: IBalanceSheetItem[]; total: number };
    nonCurrent: { items: IBalanceSheetItem[]; total: number };
    total: number;
  };
  liabilities: {
    current: { items: IBalanceSheetItem[]; total: number };
    nonCurrent: { items: IBalanceSheetItem[]; total: number };
    total: number;
  };
  equity: {
    items: IBalanceSheetItem[];
    total: number;
  };
  metrics: IBalanceSheetMetrics;
}
