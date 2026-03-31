export interface ICashFlowStatementItem {
  code?: string;
  name: string;
  amount: number;
}

export interface ICashFlowStatementMetrics {
  freeCashFlow: number; // 自由現金流 (Free Cash Flow)
  operatingCashFlowRatio: number; // 營業現金流量對流動負債比率 (%)
  cashFlowAdequacyRatio: number; // 現金流量允當比率 (%)
  cashReinvestmentRatio: number; // 現金再投資比率 (%)
}

export interface ICashFlowStatement {
  activities: {
    operating: { items: ICashFlowStatementItem[]; total: number };
    investing: { items: ICashFlowStatementItem[]; total: number };
    financing: { items: ICashFlowStatementItem[]; total: number };
  };
  summary: {
    netIncreaseDecrease: number; // 本期現金增加(減少)數
    beginningBalance: number;    // 期初現金及約當現金餘額
    endingBalance: number;       // 期末現金及約當現金餘額
  };
  supplementary: {               // 補充揭露
    interestPaid: number;
    taxesPaid: number;
  };
  metrics: ICashFlowStatementMetrics;
}