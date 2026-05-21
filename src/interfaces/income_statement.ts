export interface IIncomeStatementItem {
  code: string;
  name: string;
  amount: string | number;
  percentageOfRevenue: string;
}

export interface IIncomeStatementMetrics {
  grossMargin: string; // Info: (20260330 - Julian) 毛利率 %
  operatingMargin: string; // Info: (20260330 - Julian) 營益率 %
  netProfitMargin: string; // Info: (20260330 - Julian) 淨利率 %
  ebitda: string; // Info: (20260330 - Julian) 稅息折舊及攤銷前利潤
  ebitdaMargin: string; // Info: (20260330 - Julian) EBITDA 利潤率 %
  operatingExpenseRatio: string; // Info: (20260330 - Julian) 營業費用率 %
  nonOperatingIncomeRatio: string; // Info: (20260330 - Julian) 業外收支佔營收比率 %
  interestCoverageRatio: string | null; // Info: (20260330 - Julian) 利息保障倍數
  eps: string | null; // Info: (20260330 - Julian) 每股盈餘
  taxRate: string; // Info: (20260330 - Julian) 稅率 %
}

export interface IIncomeStatement {
  sections: {
    revenue: { items: IIncomeStatementItem[]; total: string | number };
    cogs: { items: IIncomeStatementItem[]; total: string | number };
    grossProfit: { total: string | number };
    operatingExpenses: {
      items: IIncomeStatementItem[];
      total: string | number;
    };
    operatingIncome: { total: string | number };
    nonOperating: { items: IIncomeStatementItem[]; total: string | number };
    incomeBeforeTax: { total: string | number };
    taxExpense: { items: IIncomeStatementItem[]; total: string | number };
    netIncome: { total: string | number };
  };
  metrics: IIncomeStatementMetrics;
}
