export interface IIncomeStatementItem {
  code: string;
  name: string;
  amount: number;
  percentageOfRevenue: number;
}

export interface IIncomeStatementMetrics {
  grossMargin: number; // Info: (20260330 - Julian) 毛利率 %
  operatingMargin: number; // Info: (20260330 - Julian) 營益率 %
  netProfitMargin: number; // Info: (20260330 - Julian) 淨利率 %
  ebitda: number; // Info: (20260330 - Julian) 稅息折舊及攤銷前利潤
  ebitdaMargin: number; // Info: (20260330 - Julian) EBITDA 利潤率 %
  operatingExpenseRatio: number; // Info: (20260330 - Julian) 營業費用率 %
  nonOperatingIncomeRatio: number; // Info: (20260330 - Julian) 業外收支佔營收比率 %
  interestCoverageRatio: number; // Info: (20260330 - Julian) 利息保障倍數
  eps: number; // Info: (20260330 - Julian) 每股盈餘
  taxRate: number; // Info: (20260330 - Julian) 稅率 %
}

export interface IIncomeStatement {
  reportPeriod: string;
  currency: string;
  sections: {
    revenue: { items: IIncomeStatementItem[]; total: number };
    cogs: { items: IIncomeStatementItem[]; total: number };
    grossProfit: { total: number };
    operatingExpenses: { items: IIncomeStatementItem[]; total: number };
    operatingIncome: { total: number };
    nonOperating: { items: IIncomeStatementItem[]; total: number };
    incomeBeforeTax: { total: number };
    taxExpense: { items: IIncomeStatementItem[]; total: number };
    netIncome: { total: number };
  };
  metrics: IIncomeStatementMetrics;
}

// Info: (20260330 - Julian) Mock Data for UI presentation
export const mockIncomeStatementData: IIncomeStatement = {
  reportPeriod: "2024-Q2",
  currency: "TWD",
  sections: {
    revenue: {
      items: [
        { code: "4111", name: "銷貨收入", amount: 15000000, percentageOfRevenue: 100 }
      ],
      total: 15000000,
    },
    cogs: {
      items: [
        { code: "5111", name: "銷貨成本", amount: 7500000, percentageOfRevenue: 50 },
      ],
      total: 7500000,
    },
    grossProfit: {
      total: 7500000,
    },
    operatingExpenses: {
      items: [
        { code: "6100", name: "推銷費用", amount: 1500000, percentageOfRevenue: 10 },
        { code: "6200", name: "管理費用", amount: 1200000, percentageOfRevenue: 8 },
        { code: "6300", name: "研究發展費用", amount: 800000, percentageOfRevenue: 5.3 },
      ],
      total: 3500000,
    },
    operatingIncome: {
      total: 4000000,
    },
    nonOperating: {
      items: [
        { code: "7100", name: "利息收入", amount: 150000, percentageOfRevenue: 1 },
        { code: "7500", name: "利息費用", amount: -250000, percentageOfRevenue: 1.6 },
      ],
      total: -100000,
    },
    incomeBeforeTax: {
      total: 3900000,
    },
    taxExpense: {
      items: [
        { code: "8100", name: "所得稅費用", amount: 780000, percentageOfRevenue: 5.2 },
      ],
      total: 780000,
    },
    netIncome: {
      total: 3120000,
    },
  },
  metrics: {
    grossMargin: 50.0,
    operatingMargin: 26.6,
    netProfitMargin: 20.8,
    ebitda: 4500000, // Info: (20260330 - Julian) 假設費用中有 500,000 的折舊
    ebitdaMargin: 30.0,
    operatingExpenseRatio: 23.3,
    nonOperatingIncomeRatio: -0.6,
    interestCoverageRatio: 16.0,
    eps: 3.12,
    taxRate: 20.0,
  },
};
