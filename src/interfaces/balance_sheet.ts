export interface IBalanceSheetItem {
  code: string;
  name: string;
  amount: string | number;
  percentageOfAssetOrLiabEquity: string;
}

export interface IBalanceSheetMetrics {
  currentRatio: string; // Info: (20260330 - Julian) 流動比率 %
  quickRatio: string; // Info: (20260330 - Julian) 速動比率 %
  debtRatio: string; // Info: (20260330 - Julian) 負債比率 %
  debtToEquityRatio: string; // Info: (20260330 - Julian) 負債權益比 %
  longTermFundsToFixedAssetsRatio: string; // Info: (20260330 - Julian) 長期資金占固定資產比率 %
  workingCapital: string; // Info: (20260330 - Julian) 營運資金
  cashRatio: string; // Info: (20260330 - Julian) 現金比率 %
  netWorthPerShare: string; // Info: (20260330 - Julian) 每股淨值 (requires outstanding shares, assuming predefined or omitted if not avail)
  parValue: number; // Info: (20260508 - Tzuhan) 面額
  retainedEarningsRatio: string; // Info: (20260330 - Julian) 保留盈餘佔比 %
  intangibleAssetsRatio: string; // Info: (20260330 - Julian) 無形資產佔比 %
  // Info: (20260330 - Julian) 新建議的財務比率：
  equityRatio: string; // Info: (20260330 - Julian) 業主權益比率 %
  equityMultiplier: string; // Info: (20260330 - Julian) 權益乘數
  interestBearingDebtRatio: string; // Info: (20260330 - Julian) 有息負債比率 %
  inventoryToCurrentAssetsRatio: string; // Info: (20260330 - Julian) 存貨佔流動資產比率
  arToTotalAssetsRatio: string; // Info: (20260330 - Julian) 應收帳款佔總資產比率
  fixedAssetsToEquityRatio: string; // Info: (20260330 - Julian) 固定資產對權益比率

  // Info: (20260518 - Tzuhan) [AUDIT FIX] 補充揭露：供跨表指標 (如現金再投資比率) 計算使用之絕對數值
  fixedAssetsTotal?: string; // Info: (20260518 - Tzuhan) 固定資產總額
  longTermInvestmentsTotal?: string; // Info: (20260518 - Tzuhan) 長期投資總額
  otherAssetsTotal?: string; // Info: (20260518 - Tzuhan) 其他資產總額
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
