import { IVoucherLineUI } from "@/interfaces/voucher";
import {
  ICashFlowStatement,
  ICashFlowStatementItem,
} from "@/interfaces/cash_flow_statement";

export function generateCashFlowStatement(
  lineItems: IVoucherLineUI[],
): ICashFlowStatement {
  const operatingItems = new Map<string, { name: string; amount: number }>();
  const investingItems = new Map<string, { name: string; amount: number }>();
  const financingItems = new Map<string, { name: string; amount: number }>();

  // Info: (20260330 - Julian) 加入項目：amount > 0 表現金流入, amount < 0 表現金流出
  const addItem = (
    map: Map<string, { name: string; amount: number }>,
    name: string,
    amount: number,
  ) => {
    if (amount === 0) return;
    const current = map.get(name)?.amount || 0;
    map.set(name, { name, amount: current + amount });
  };

  // Info: (20260330 - Julian) 關鍵指標
  let netIncome = 0;
  let depreciationAndAmortization = 0;
  let capitalExpenditure = 0;

  // Info: (20260330 - Julian) 補充揭露
  let interestPaid = 0;
  let taxesPaid = 0;

  // Info: (20260330 - Julian) 計算營業現金流對流動負債比率
  let currentLiabilitiesTotal = 0;

  lineItems.forEach((line) => {
    // Info: (20260331 - Julian) 確保有會計科目且借貸方有值
    if (!line.accounting || line.isDebit === null) return;

    // Info: (20260331 - Julian) 解構
    const {
      accounting: { code, name },
      isDebit,
      amount,
    } = line;

    /* Info: (20260330 - Julian)
     * 1. 資產增加(借方)代表現金流出，減少(貸方)代表現金流入
     * 2. 負債/權益/收益增加(貸方)代表現金流入，減少(借方)代表現金流出
     * 3. 費損增加(借方)代表減少淨利
     */

    // Info: (20260331 - Julian) 現金或淨利影響：貸方 = 現金流入/淨利增加 = 正向，借方 = 現金流出/淨利減少 = 負向
    const impact = isDebit ? -amount : amount;

    // Info: (20260330 - Julian) 1. 計算應計基礎淨利 (Net Income)
    if (
      code.startsWith("4") ||
      code.startsWith("5") ||
      code.startsWith("6") ||
      code.startsWith("7") ||
      code.startsWith("8")
    ) {
      netIncome += impact;

      // Info: (20260330 - Julian) 分離折舊與攤銷 (非現金費用加回)
      if (name.includes("折舊") || name.includes("攤銷")) {
        depreciationAndAmortization += isDebit ? amount : -amount;
      }

      // Info: (20260330 - Julian) 補充揭露
      if (name.includes("利息費用")) interestPaid += isDebit ? amount : -amount;
      if (name.includes("所得稅費用")) taxesPaid += isDebit ? amount : -amount;
    }

    // Info: (20260330 - Julian) 2. 營業活動 - 營運營運資金變動
    if (code.startsWith("11") || code.startsWith("12")) {
      // Info: (20260331 - Julian) 排除現金
      if (!code.startsWith("110")) {
        addItem(operatingItems, `[營運資金] ${name}變動`, impact);
      }
    } else if (code.startsWith("13") || code.startsWith("14")) {
      // Info: (20260331 - Julian) 存貨
      if (code.startsWith("13")) {
        addItem(operatingItems, `[營運資金] ${name}變動`, impact);
      }
    }

    // Info: (20260330 - Julian) 流動負債變動 (營業活動)
    if (code.startsWith("21") || code.startsWith("22")) {
      // Info: (20260330 - Julian) 短期借款歸類融資
      if (code.startsWith("212")) {
        addItem(financingItems, `短期借款變動`, impact);
      } else {
        addItem(operatingItems, `[營運資金] ${name}變動`, impact);
      }
      if (isDebit) currentLiabilitiesTotal -= amount;
      else currentLiabilitiesTotal += amount;
    }

    // Info: (20260330 - Julian) 3. 投資活動
    if (
      code.startsWith("15") ||
      code.startsWith("16") ||
      code.startsWith("17") ||
      code.startsWith("18") ||
      code.startsWith("19")
    ) {
      // Info: (20260330 - Julian) 粗略算資本支出 (不動產廠房設備增加=借方)
      if (isDebit && (code.startsWith("15") || code.startsWith("16"))) {
        capitalExpenditure += amount;
      }
      addItem(investingItems, `取得/處分 ${name}`, impact);
    }
    // Info: (20260330 - Julian) 長期投資
    if (code.startsWith("14")) {
      addItem(investingItems, `長期投資變動`, impact);
    }

    // Info: (20260330 - Julian) 4. 籌資活動 (融資)
    if (
      code.startsWith("25") ||
      code.startsWith("26") ||
      code.startsWith("28") ||
      code.startsWith("29")
    ) {
      addItem(financingItems, `長期負債變動: ${name}`, impact);
    }
    if (code.startsWith("3")) {
      if (code.startsWith("33")) {
        // Info: (20260330 - Julian) 保留盈餘變動可能包含本期損益結轉及發放股利。這裡簡化處理：如果有名稱含「股利」，則列入融資流出
        if (name.includes("股利")) {
          addItem(financingItems, `發放股利 (${name})`, impact);
        }
      } else {
        addItem(financingItems, `權益變動: ${name}`, impact);
      }
    }
  });

  // Info: (20260330 - Julian) 轉換 Map 為 ICashFlowStatementItem[] (首項為本期淨利與折舊加回)
  const mapToArray = (
    map: Map<string, { name: string; amount: number }>,
  ): ICashFlowStatementItem[] => {
    return Array.from(map.values()).filter((i) => i.amount !== 0);
  };

  // Info: (20260331 - Julian) 組合「營業項目」數據
  const finalOperatingItems: ICashFlowStatementItem[] = [];
  finalOperatingItems.push({ name: "本期稅後淨利", amount: netIncome });
  if (depreciationAndAmortization !== 0) {
    finalOperatingItems.push({
      name: "折舊及攤銷費用(加回)",
      amount: depreciationAndAmortization,
    });
  }
  finalOperatingItems.push(...mapToArray(operatingItems));

  const totalOperating = finalOperatingItems.reduce(
    (acc, curr) => acc + curr.amount,
    0,
  );
  const finalInvestingItems = mapToArray(investingItems);
  const totalInvesting = finalInvestingItems.reduce(
    (acc, curr) => acc + curr.amount,
    0,
  );
  const finalFinancingItems = mapToArray(financingItems);
  const totalFinancing = finalFinancingItems.reduce(
    (acc, curr) => acc + curr.amount,
    0,
  );

  // Info: (20260330 - Julian) 暫無期初/期末資訊，以本期變動為基礎，期初設為0
  const beginningBalance = 0;
  const netIncreaseDecrease = totalOperating + totalInvesting + totalFinancing;
  const endingBalance = beginningBalance + netIncreaseDecrease;

  // Info: (20260330 - Julian) 計算指標
  const freeCashFlow = totalOperating - capitalExpenditure; // Info: (20260330 - Julian) 自由現金流
  // Info: (20260330 - Julian) 營業現金流對流動負債比率 = 總營業現金流 / 流動負債
  const safeDivide = (num: number, den: number) =>
    den === 0 || isNaN(den) ? 0 : num / den;
  const operatingCashFlowRatio =
    safeDivide(totalOperating, currentLiabilitiesTotal) * 100;

  return {
    reportPeriod: "",
    currency: "TWD",
    activities: {
      operating: { items: finalOperatingItems, total: totalOperating },
      investing: { items: finalInvestingItems, total: totalInvesting },
      financing: { items: finalFinancingItems, total: totalFinancing },
    },
    summary: {
      netIncreaseDecrease: netIncreaseDecrease,
      beginningBalance: beginningBalance,
      endingBalance: endingBalance,
    },
    supplementary: {
      interestPaid,
      taxesPaid,
    },
    metrics: {
      freeCashFlow,
      operatingCashFlowRatio,
      cashFlowAdequacyRatio:
        safeDivide(
          totalOperating,
          capitalExpenditure + Math.abs(totalFinancing),
        ) * 100, // Info: (20260330 - Julian) 簡化版
      cashReinvestmentRatio:
        safeDivide(
          totalOperating - calculateDividends(finalFinancingItems),
          1000000,
        ) * 100, // Info: (20260330 - Julian) 簡化版 (需要總資產，這裡無法直接取得)
    },
  };
}

function calculateDividends(items: ICashFlowStatementItem[]) {
  return items
    .filter((i) => i.name.includes("股利"))
    .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
}
