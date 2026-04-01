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
