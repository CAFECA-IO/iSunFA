// Info: (20260518 - Tzuhan) [INTERFACE COMPLIANCE REFACTOR]

export interface ICashFlowStatementItem {
  code?: string;
  name: string;
  amount: string | number;
}

export interface ICashFlowStatementMetrics {
  freeCashFlow: number; // Info: (20260330 - Julian) 自由現金流 (Free Cash Flow)
  // Info: (20260518 - Tzuhan) [AUDIT FIX] 以下跨表比率已移至編排層 (AnalysisService) 計算，現金流引擎回傳 null
  operatingCashFlowRatio: number | null;
  cashFlowAdequacyRatio: number | null;
  cashReinvestmentRatio: number | null;
}

export interface ICashFlowStatementSupplementary {
  interestPaid: string | number; // Info: (20260518 - Tzuhan) 支付利息
  taxesPaid: string | number; // Info: (20260518 - Tzuhan) 支付所得稅
  // Info: (20260518 - Tzuhan) [AUDIT FIX] 顯式定義跨表勾稽必備的補充揭露明細，拒絕自由欄位
  capitalExpenditure?: string | number; // Info: (20260518 - Tzuhan) 資本支出
  inventoryChange?: string | number; // Info: (20260518 - Tzuhan) 存貨變動額
  dividendsPaid?: string | number; // Info: (20260518 - Tzuhan) 現金股利發放額
}

export interface ICashFlowStatement {
  reportPeriod: string;
  currency: string;
  activities: {
    operating: { items: ICashFlowStatementItem[]; total: string | number };
    investing: { items: ICashFlowStatementItem[]; total: string | number };
    financing: { items: ICashFlowStatementItem[]; total: string | number };
  };
  summary: {
    netIncreaseDecrease: string | number; // Info: (20260330 - Julian) 本期現金增加(減少)數
    beginningBalance: string | number; // Info: (20260330 - Julian) 期初現金及約當現金餘額
    endingBalance: string | number; // Info: (20260330 - Julian) 期末現金及約當現金餘額
  };
  supplementary?: ICashFlowStatementSupplementary;
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
      total: -800000, // Info: (20260518 - Tzuhan) 修正舊版 mock 誤將取得與處分加總算錯的 Bug (應該是 -80萬)
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
    netIncreaseDecrease: 1050000, // Info: (20260518 - Tzuhan) 修正數據：165萬(營業) - 80萬(投資) + 20萬(籌資) = 105萬變動
    endingBalance: 2300000, // Info: (20260518 - Tzuhan) 修正數據：125萬期初 + 105萬變動 = 230萬期末
  },
  supplementary: {
    interestPaid: 50000,
    taxesPaid: 300000,
    capitalExpenditure: 800000, // Info: (20260518 - Tzuhan) 對應投資活動的取得設備
    inventoryChange: -100000, // Info: (20260518 - Tzuhan) 對應營運资金的存貨變動
    dividendsPaid: 500000, // Info: (20260518 - Tzuhan) 對應籌資活動的發放股利
  },
  metrics: {
    freeCashFlow: 850000, // Info: (20260330 - Julian) 1650000 - 800000
    // Info: (20260518 - Tzuhan) [AUDIT SIGN-OFF] 測試資料同步回歸真理，跨表指標在現金流單表輸出時一律為 null
    operatingCashFlowRatio: null,
    cashFlowAdequacyRatio: null,
    cashReinvestmentRatio: null,
  },
};
