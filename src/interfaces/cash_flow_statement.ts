export interface ICashFlowStatementItem {
  code?: string;
  name: string;
  amount: number;
}

export interface ICashFlowStatementMetrics {
  freeCashFlow: number; // Info: (20260330 - Julian) 自由現金流 (Free Cash Flow)
  operatingCashFlowRatio: number; // Info: (20260330 - Julian) 營業現金流量對流動負債比率 (%)
  cashFlowAdequacyRatio: number; // Info: (20260330 - Julian) 現金流量允當比率 (%)
  cashReinvestmentRatio: number; // Info: (20260330 - Julian) 現金再投資比率 (%)
}

export interface ICashFlowStatement {
  activities: {
    operating: { items: ICashFlowStatementItem[]; total: number };
    investing: { items: ICashFlowStatementItem[]; total: number };
    financing: { items: ICashFlowStatementItem[]; total: number };
  };
  summary: {
    netIncreaseDecrease: number; // Info: (20260330 - Julian) 本期現金增加(減少)數
    beginningBalance: number;    // Info: (20260330 - Julian) 期初現金及約當現金餘額
    endingBalance: number;       // Info: (20260330 - Julian) 期末現金及約當現金餘額
  };
  supplementary: {               // Info: (20260330 - Julian) 補充揭露
    interestPaid: number;
    taxesPaid: number;
  };
  metrics: ICashFlowStatementMetrics;
}

// Info: (20260330 - Julian) 模擬測試資料
export const mockCashFlowStatementData: ICashFlowStatement = {
  reportPeriod: "2024-Q2",
  currency: "TWD",
  activities: {
    operating: {
      items: [
        { name: "本期稅後淨利", amount: 1500000 },
        { name: "折舊及攤銷費用(加回)", amount: 300000 },
        { name: "[營運資金] 應收帳款變動", amount: -200000 },
        { name: "[營運資金] 存貨變動", amount: -100000 },
        { name: "[營運資金] 應付帳款變動", amount: 150000 },
      ],
      total: 1650000,
    },
    investing: {
      items: [
        { name: "取得 不動產、廠房及設備", amount: -800000 },
        { name: "處分 長期投資", amount: 200000 },
      ],
      total: -600000,
    },
    financing: {
      items: [
        { name: "短期借款變動", amount: -300000 },
        { name: "發放現金股利", amount: -500000 },
        { name: "長期負債變動: 長期銀行借款", amount: 1000000 },
      ],
      total: 200000,
    },
  },
  summary: {
    beginningBalance: 1250000,
    netIncreaseDecrease: 1250000,
    endingBalance: 2500000,
  },
  supplementary: {
    interestPaid: 50000,
    taxesPaid: 300000,
  },
  metrics: {
    freeCashFlow: 850000, // Info: (20260330 - Julian) 1650000 - 800000
    operatingCashFlowRatio: 45.3,
    cashFlowAdequacyRatio: 110.5,
    cashReinvestmentRatio: 8.5,
  },
};
