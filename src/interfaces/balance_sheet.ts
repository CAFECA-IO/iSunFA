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
  reportPeriod: string;
  currency: string;
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

// Info: (20260330 - Julian) mock data
export const mockBalanceSheetData: IBalanceSheet = {
  reportPeriod: "2024-Q2",
  currency: "TWD",
  metrics: {
    currentRatio: 222.7,
    quickRatio: 180.5,
    debtRatio: 37.5,
    debtToEquityRatio: 60.0,
    equityMultiplier: 1.6,
    workingCapital: 1350000,
    equityRatio: 62.5,
    interestBearingDebtRatio: 15.0,
    inventoryToCurrentAssetsRatio: 10.0,
    arToTotalAssetsRatio: 10.0,
    fixedAssetsToEquityRatio: 10.0,
    longTermFundsToFixedAssetsRatio: 10.0,
    cashRatio: 10.0,
    netWorthPerShare: 10.0,
    retainedEarningsRatio: 10.0,
    intangibleAssetsRatio: 10.0,
  },
  assets: {
    current: {
      total: 2450000,
      items: [
        {
          code: "1100",
          name: "現金及約當現金",
          amount: 1200000,
          percentageOfAssetOrLiabEquity: 29.6,
        },
        {
          code: "1170",
          name: "應收帳款淨額",
          amount: 1250000,
          percentageOfAssetOrLiabEquity: 30.9,
        },
      ],
    },
    nonCurrent: {
      total: 5800000,
      items: [
        {
          code: "1500",
          name: "不動產、廠房及設備",
          amount: 5000000,
          percentageOfAssetOrLiabEquity: 100,
        },
        {
          code: "1700",
          name: "無形資產",
          amount: 800000,
          percentageOfAssetOrLiabEquity: 100,
        },
      ],
    },
    total: 8250000,
  },
  liabilities: {
    current: {
      total: 1100000,
      items: [
        {
          code: "2100",
          name: "短期借款",
          amount: 500000,
          percentageOfAssetOrLiabEquity: 35.7,
        },
        {
          code: "2170",
          name: "應付帳款",
          amount: 600000,
          percentageOfAssetOrLiabEquity: 42.8,
        },
      ],
    },
    nonCurrent: {
      total: 2000000,
      items: [
        {
          code: "2500",
          name: "長期借款",
          amount: 2000000,
          percentageOfAssetOrLiabEquity: 100,
        },
      ],
    },
    total: 3100000,
  },
  equity: {
    total: 5150000,
    items: [
      {
        code: "3100",
        name: "股本",
        amount: 3000000,
        percentageOfAssetOrLiabEquity: 58.2,
      },
      {
        code: "3300",
        name: "保留盈餘",
        amount: 2150000,
        percentageOfAssetOrLiabEquity: 41.7,
      },
    ],
  },
};
