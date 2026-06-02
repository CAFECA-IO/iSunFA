/**
 * Info: (20260601 - Tzuhan) [E2E SEEDER] 漸進式財報配平驗證器
 * progressive_verifier.ts
 * 用途：模擬時間軸漸進式測試 (Time-Based Progressive Stacking)。
 * 行為：
 * 1. 在記憶體中自動生成 N 筆憑證 (預設為 1 天約 150 筆)
 * 2. 「一張一張」依序丟入系統
 * 3. 每一張丟入後，立刻產出當下的 BS, IS, CF
 * 4. 嚴格斷言 A = L + E 是否配平。若不平，立刻中斷並報警，確保零容忍任何低級錯誤。
 */

import { generateBalanceSheet } from "@/lib/report/balance_sheet_generator";
import { generateIncomeStatement } from "@/lib/report/income_statement_generator";
import { generateCashFlowStatement } from "@/lib/report/cash_flow_statement_generator";
import { getAccountByCode } from "@/lib/utils/account";
import { IBalanceSheet } from "@/interfaces/balance_sheet";
import { IIncomeStatement } from "@/interfaces/income_statement";
import { ICashFlowStatement } from "@/interfaces/cash_flow_statement";
import * as fs from "fs";
import * as path from "path";
import { IVoucherLineUI } from "@/interfaces/voucher";

// Info: (20260601 - Tzuhan 工具函數：確保必定能抓到會計科目，拒絕 any 或 undefined
function mustGetAccount(code: string) {
  const acc = getAccountByCode(code);
  if (!acc) {
    throw new Error(`[致命錯誤] 系統科目表中完全找不到科目代碼: ${code}`);
  }
  return acc;
}

// Info: (20260601 - Tzuhan 工具函數：精確處理字串加總
function sumItems(items: { amount: string | number }[]): bigint {
  return items.reduce((acc, curr) => acc + BigInt(curr.amount), 0n);
}

// Info: (20260601 - Tzuhan 嚴格檢驗三表內部每一個欄位與小計的數學正確性
function assertReportIntegrity(
  bs: IBalanceSheet,
  is: IIncomeStatement,
  cf: ICashFlowStatement,
) {
  // Info: (20260601 - Tzuhan --- IS 內部數學檢驗 ---
  const revTotal = sumItems(is.sections.revenue.items);
  if (revTotal !== BigInt(is.sections.revenue.total))
    throw new Error(
      `[IS] Revenue items sum ${revTotal} !== ${is.sections.revenue.total}`,
    );

  const cogsTotal = sumItems(is.sections.cogs.items);
  if (cogsTotal !== BigInt(is.sections.cogs.total))
    throw new Error(
      `[IS] COGS items sum ${cogsTotal} !== ${is.sections.cogs.total}`,
    );

  const gpTotal = revTotal - cogsTotal;
  if (gpTotal !== BigInt(is.sections.grossProfit.total))
    throw new Error(
      `[IS] Gross Profit ${gpTotal} !== ${is.sections.grossProfit.total}`,
    );

  const opexTotal = sumItems(is.sections.operatingExpenses.items);
  if (opexTotal !== BigInt(is.sections.operatingExpenses.total))
    throw new Error(
      `[IS] Opex items sum ${opexTotal} !== ${is.sections.operatingExpenses.total}`,
    );

  const opIncome = gpTotal - opexTotal;
  if (opIncome !== BigInt(is.sections.operatingIncome.total))
    throw new Error(
      `[IS] Operating Income ${opIncome} !== ${is.sections.operatingIncome.total}`,
    );

  const nonOpTotal = sumItems(is.sections.nonOperating.items);
  if (nonOpTotal !== BigInt(is.sections.nonOperating.total))
    throw new Error(
      `[IS] Non-Operating items sum ${nonOpTotal} !== ${is.sections.nonOperating.total}`,
    );

  const ebt = opIncome + nonOpTotal;
  if (ebt !== BigInt(is.sections.incomeBeforeTax.total))
    throw new Error(`[IS] EBT ${ebt} !== ${is.sections.incomeBeforeTax.total}`);

  const taxTotal = sumItems(is.sections.taxExpense.items);
  if (taxTotal !== BigInt(is.sections.taxExpense.total))
    throw new Error(
      `[IS] Tax items sum ${taxTotal} !== ${is.sections.taxExpense.total}`,
    );

  const netIncome = ebt - taxTotal;
  if (netIncome !== BigInt(is.sections.netIncome.total))
    throw new Error(
      `[IS] Net Income ${netIncome} !== ${is.sections.netIncome.total}`,
    );

  // Info: (20260601 - Tzuhan --- BS 內部數學檢驗 ---
  const caTotal = sumItems(bs.assets.current.items);
  if (caTotal !== BigInt(bs.assets.current.total))
    throw new Error(
      `[BS] Current Assets items sum ${caTotal} !== ${bs.assets.current.total}`,
    );

  const ncaTotal = sumItems(bs.assets.nonCurrent.items);
  if (ncaTotal !== BigInt(bs.assets.nonCurrent.total))
    throw new Error(
      `[BS] Non-Current Assets items sum ${ncaTotal} !== ${bs.assets.nonCurrent.total}`,
    );

  const aTotal = caTotal + ncaTotal;
  if (aTotal !== BigInt(bs.assets.total))
    throw new Error(`[BS] Total Assets ${aTotal} !== ${bs.assets.total}`);

  const clTotal = sumItems(bs.liabilities.current.items);
  if (clTotal !== BigInt(bs.liabilities.current.total))
    throw new Error(
      `[BS] Current Liab items sum ${clTotal} !== ${bs.liabilities.current.total}`,
    );

  const nclTotal = sumItems(bs.liabilities.nonCurrent.items);
  if (nclTotal !== BigInt(bs.liabilities.nonCurrent.total))
    throw new Error(
      `[BS] Non-Current Liab items sum ${nclTotal} !== ${bs.liabilities.nonCurrent.total}`,
    );

  const lTotal = clTotal + nclTotal;
  if (lTotal !== BigInt(bs.liabilities.total))
    throw new Error(`[BS] Total Liab ${lTotal} !== ${bs.liabilities.total}`);

  const eqTotal = sumItems(bs.equity.items);
  if (eqTotal !== BigInt(bs.equity.total))
    throw new Error(`[BS] Equity items sum ${eqTotal} !== ${bs.equity.total}`);

  // Info: (20260601 - Tzuhan --- CF 內部數學檢驗 ---
  const cfOpTotal = sumItems(cf.activities.operating.items);
  if (cfOpTotal !== BigInt(cf.activities.operating.total))
    throw new Error(
      `[CF] Operating items sum ${cfOpTotal} !== ${cf.activities.operating.total}`,
    );

  const cfInvTotal = sumItems(cf.activities.investing.items);
  if (cfInvTotal !== BigInt(cf.activities.investing.total))
    throw new Error(
      `[CF] Investing items sum ${cfInvTotal} !== ${cf.activities.investing.total}`,
    );

  const cfFinTotal = sumItems(cf.activities.financing.items);
  if (cfFinTotal !== BigInt(cf.activities.financing.total))
    throw new Error(
      `[CF] Financing items sum ${cfFinTotal} !== ${cf.activities.financing.total}`,
    );

  const netChange = cfOpTotal + cfInvTotal + cfFinTotal;
  if (netChange !== BigInt(cf.summary.netIncreaseDecrease))
    throw new Error(
      `[CF] Net Change ${netChange} !== ${cf.summary.netIncreaseDecrease}`,
    );

  const endingBal = BigInt(cf.summary.beginningBalance) + netChange;
  if (endingBal !== BigInt(cf.summary.endingBalance))
    throw new Error(
      `[CF] Ending Balance ${endingBal} !== ${cf.summary.endingBalance}`,
    );
}

function generateDailyVouchers(dayIndex: number, startLineId: number): { vouchers: IVoucherLineUI[][], nextLineId: number } {
  const vouchers: IVoucherLineUI[][] = [];
  let lineId = startLineId;

  if (dayIndex === 0) {

  // Info: (20260601 - Tzuhan 1. 開張股本注資 (1筆)
  vouchers.push([
    {
      id: `l-${lineId++}`,
      accountingCode: "1101", // Info: (20260601 - Tzuhan 現金
      accounting: mustGetAccount("1101"),
      particular: "股東注資",
      amount: "15000000", // Info: (20260601 - Tzuhan 1500萬
      isDebit: true,
    },
    {
      id: `l-${lineId++}`,
      accountingCode: "3110", // Info: (20260601 - Tzuhan 普通股股本
      accounting: mustGetAccount("3110"),
      particular: "股東注資",
      amount: "15000000",
      isDebit: false,
    },
  ]);

  // Info: (20260601 - Tzuhan 2. 向銀行短期借款 (1筆)
  vouchers.push([
    {
      id: `l-${lineId++}`,
      accountingCode: "1101",
      accounting: mustGetAccount("1101"),
      particular: "銀行短期借款",
      amount: "5000000",
      isDebit: true,
    },
    {
      id: `l-${lineId++}`,
      accountingCode: "2100", // Info: (20260601 - Tzuhan 短期借款
      accounting: mustGetAccount("2100"),
      particular: "銀行短期借款",
      amount: "5000000",
      isDebit: false,
    },
  ]);

  // Info: (20260601 - Tzuhan 3. 預付一年租金 (1筆)
  vouchers.push([
    {
      id: `l-${lineId++}`,
      accountingCode: "1410", // Info: (20260601 - Tzuhan 預付款項
      accounting: mustGetAccount("1410"),
      particular: "預付辦公室租金",
      amount: "1200000",
      isDebit: true,
    },
    {
      id: `l-${lineId++}`,
      accountingCode: "1101",
      accounting: mustGetAccount("1101"),
      particular: "支付預付租金",
      amount: "1200000",
      isDebit: false,
    },
  ]);

  // Info: (20260601 - Tzuhan 4. 購買設備 (1筆)
  vouchers.push([
    {
      id: `l-${lineId++}`,
      accountingCode: "1600", // Info: (20260601 - Tzuhan 不動產廠房設備
      accounting: mustGetAccount("1600"),
      particular: "購入生產設備",
      amount: "3000000",
      isDebit: true,
    },
    {
      id: `l-${lineId++}`,
      accountingCode: "1101",
      accounting: mustGetAccount("1101"),
      particular: "支付設備款",
      amount: "3000000",
      isDebit: false,
    },
  ]);
  }

  // Info: (20260601 - Tzuhan 5. 模擬 146 筆單日交易 (包含進銷存、應收應付、薪資、各類費用)
  for (let i = 0; i < 146; i++) {
    const rand = Math.random();
    if (rand < 0.2) {
      // Info: (20260601 - Tzuhan 20% 機率：銷貨收現
      const amount = Math.floor(Math.random() * 50000 + 1000).toString();
      vouchers.push([
        {
          id: `l-${lineId++}`,
          accountingCode: "1101",
          accounting: mustGetAccount("1101"),
          particular: "銷貨收現",
          amount,
          isDebit: true,
        },
        {
          id: `l-${lineId++}`,
          accountingCode: "4111",
          accounting: mustGetAccount("4111"),
          particular: "銷貨收入",
          amount,
          isDebit: false,
        },
      ]);
    } else if (rand < 0.4) {
      // Info: (20260601 - Tzuhan 20% 機率：賒銷 (產生應收帳款)
      const amount = Math.floor(Math.random() * 100000 + 5000).toString();
      vouchers.push([
        {
          id: `l-${lineId++}`,
          accountingCode: "1170",
          accounting: mustGetAccount("1170"),
          particular: "銷貨(未收款)",
          amount,
          isDebit: true,
        },
        {
          id: `l-${lineId++}`,
          accountingCode: "4111",
          accounting: mustGetAccount("4111"),
          particular: "銷貨收入",
          amount,
          isDebit: false,
        },
      ]);
    } else if (rand < 0.5) {
      // Info: (20260601 - Tzuhan 10% 機率：收回部分應收帳款
      const amount = Math.floor(Math.random() * 20000 + 1000).toString();
      vouchers.push([
        {
          id: `l-${lineId++}`,
          accountingCode: "1101",
          accounting: mustGetAccount("1101"),
          particular: "收回客戶欠款",
          amount,
          isDebit: true,
        },
        {
          id: `l-${lineId++}`,
          accountingCode: "1170",
          accounting: mustGetAccount("1170"),
          particular: "沖銷應收帳款",
          amount,
          isDebit: false,
        },
      ]);
    } else if (rand < 0.6) {
      // Info: (20260601 - Tzuhan 10% 機率：進貨付現
      const amount = Math.floor(Math.random() * 30000 + 500).toString();
      vouchers.push([
        {
          id: `l-${lineId++}`,
          accountingCode: "130X",
          accounting: mustGetAccount("130X"),
          particular: "進貨",
          amount,
          isDebit: true,
        },
        {
          id: `l-${lineId++}`,
          accountingCode: "1101",
          accounting: mustGetAccount("1101"),
          particular: "進貨付現",
          amount,
          isDebit: false,
        },
      ]);
    } else if (rand < 0.75) {
      // Info: (20260601 - Tzuhan 15% 機率：賒購 (產生應付帳款)
      const amount = Math.floor(Math.random() * 80000 + 10000).toString();
      vouchers.push([
        {
          id: `l-${lineId++}`,
          accountingCode: "130X",
          accounting: mustGetAccount("130X"),
          particular: "進貨(未付款)",
          amount,
          isDebit: true,
        },
        {
          id: `l-${lineId++}`,
          accountingCode: "2170",
          accounting: mustGetAccount("2170"),
          particular: "應付帳款",
          amount,
          isDebit: false,
        },
      ]);
    } else if (rand < 0.85) {
      // Info: (20260601 - Tzuhan 10% 機率：支付薪資
      const amount = Math.floor(Math.random() * 50000 + 30000).toString();
      vouchers.push([
        {
          id: `l-${lineId++}`,
          accountingCode: "6210",
          accounting: mustGetAccount("6210"),
          particular: "員工薪資",
          amount,
          isDebit: true,
        },
        {
          id: `l-${lineId++}`,
          accountingCode: "1101",
          accounting: mustGetAccount("1101"),
          particular: "支付薪資",
          amount,
          isDebit: false,
        },
      ]);
    } else if (rand < 0.95) {
      // Info: (20260601 - Tzuhan 10% 機率：結轉銷貨成本 (COGS)
      const amount = Math.floor(Math.random() * 30000 + 1000).toString();
      vouchers.push([
        {
          id: `l-${lineId++}`,
          accountingCode: "5111",
          accounting: mustGetAccount("5111"),
          particular: "結轉成本",
          amount,
          isDebit: true,
        },
        {
          id: `l-${lineId++}`,
          accountingCode: "130X",
          accounting: mustGetAccount("130X"),
          particular: "沖銷存貨",
          amount,
          isDebit: false,
        },
      ]);
    } else {
      // Info: (20260601 - Tzuhan 5% 機率：雜支 (水電/交際費)
      const amount = Math.floor(Math.random() * 5000 + 500).toString();
      const expenseCodes = ["6214", "6215", "6216"]; // Info: (20260601 - Tzuhan 差旅, 水電, 交際
      const code =
        expenseCodes[Math.floor(Math.random() * expenseCodes.length)];
      vouchers.push([
        {
          id: `l-${lineId++}`,
          accountingCode: code,
          accounting: mustGetAccount(code),
          particular: "日常雜支",
          amount,
          isDebit: true,
        },
        {
          id: `l-${lineId++}`,
          accountingCode: "1101",
          accounting: mustGetAccount("1101"),
          particular: "支付雜支",
          amount,
          isDebit: false,
        },
      ]);
    }
  }

  return { vouchers, nextLineId: lineId };
}

async function runProgressiveVerification() {
  const args = process.argv.slice(2);
  const totalDays = args.length > 0 ? parseInt(args[0], 10) : 1;
  if (isNaN(totalDays) || totalDays < 1) {
    console.error("請輸入有效的天數 (例如 1, 30, 365)");
    process.exit(1);
  }

  console.log(`🚀 [Progressive Verifier] 開始生成 ${totalDays} 天的測試憑證...`);
  
  const allVouchers: { lines: IVoucherLineUI[], dayIndex: number }[] = [];
  let currentLineId = 1;

  for (let day = 0; day < totalDays; day++) {
    const { vouchers, nextLineId } = generateDailyVouchers(day, currentLineId);
    currentLineId = nextLineId;
    for (const v of vouchers) {
      allVouchers.push({ lines: v, dayIndex: day });
    }
  }
  
  console.log(`✅ 成功生成 ${allVouchers.length} 張憑證。`);

  console.log("\n🔍 開始一張一張丟入系統並進行財報配平稽核...");

  const cumulativeLines: IVoucherLineUI[] = [];

  for (let i = 0; i < allVouchers.length; i++) {
    const voucherInfo = allVouchers[i];
    cumulativeLines.push(...voucherInfo.lines);

    // Info: (20260601 - Tzuhan 每次丟入後，立刻產生當下三表
    const is = generateIncomeStatement(cumulativeLines);
    const bs = generateBalanceSheet(cumulativeLines, 10);
    const cf = generateCashFlowStatement(cumulativeLines, "0");

    // ---------------------------------------------------------
    // Info: (20260601 - Tzuhan 嚴格斷言 0: 三大表內部所有欄位、小計與總計的數學正確性
    // ---------------------------------------------------------
    try {
      assertReportIntegrity(bs, is, cf);
    } catch (err) {
      console.error(
        `\n❌ [致命錯誤] 內部欄位加總邏輯錯誤於第 ${i + 1} 張憑證！`,
      );
      console.error(
        `🚨 細節: ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exit(1);
    }

    // ---------------------------------------------------------
    // Info: (20260601 - Tzuhan 嚴格斷言 1: 資產負債表 (BS) 恆等式
    // ---------------------------------------------------------
    const assets = BigInt(bs.assets.total);
    const liabilities = BigInt(bs.liabilities.total);
    const equity = BigInt(bs.equity.total);

    if (assets !== liabilities + equity) {
      console.error(`\n❌ [致命錯誤] BS 財報配平失敗於第 ${i + 1} 張憑證！`);
      console.error(
        `🚨 Assets (${assets}) !== Liabilities (${liabilities}) + Equity (${equity})`,
      );
      process.exit(1);
    }

    // ---------------------------------------------------------
    // Info: (20260601 - Tzuhan 嚴格斷言 2: 損益表 (IS) 與資產負債表 (BS) 勾稽
    // ---------------------------------------------------------
    const isNetIncome = is.sections.netIncome.total;
    const bsCurrentEarnings =
      bs.equity.items.find((item) => item.code === "3353")?.amount || "0"; // 3353 本期損益

    if (isNetIncome !== bsCurrentEarnings) {
      console.error(`\n❌ [致命錯誤] IS 與 BS 勾稽失敗於第 ${i + 1} 張憑證！`);
      console.error(
        `🚨 IS 淨利 (${isNetIncome}) !== BS 本期損益 (${bsCurrentEarnings})`,
      );
      process.exit(1);
    }

    // ---------------------------------------------------------
    // Info: (20260601 - Tzuhan 嚴格斷言 3: 現金流量表 (CF) 與資產負債表 (BS) 勾稽
    // ---------------------------------------------------------
    const cfEndingCash = cf.summary.endingBalance;
    const bsCash =
      bs.assets.current.items.find((item) => item.code === "1101")?.amount ||
      "0"; // 1101 現金及約當現金

    if (cfEndingCash !== bsCash) {
      console.error(`\n❌ [致命錯誤] CF 與 BS 勾稽失敗於第 ${i + 1} 張憑證！`);
      console.error(
        `🚨 CF 期末現金 (${cfEndingCash}) !== BS 現金及約當現金 (${bsCash})`,
      );
      process.exit(1);
    }

    // Info: (20260601 - Tzuhan 每 20 張回報一次進度
    if ((i + 1) % 20 === 0 || i === allVouchers.length - 1) {
      console.log(
        `✅ [${i + 1}/${allVouchers.length}] 三表勾稽 (BS配平, IS->BS, CF->BS) 確認通過！當前總現金: ${bsCash}`,
      );
    }
  }

  console.log(
    `\n🎉 [驗證成功] ${allVouchers.length} 張憑證 (共 ${totalDays} 天) 已全數通過漸進式財報配平考驗！沒有發現任何低級錯誤！`,
  );

  // Info: (20260601 - Tzuhan 轉換格式為 ISimulatedVoucher 以供 receipt_image_generator 使用
  const exportedVouchers = allVouchers.map((voucherInfo, idx) => {
    // 根據 dayIndex 推進日期
    const date = new Date("2024-01-01");
    date.setDate(date.getDate() + voucherInfo.dayIndex);
    const dateString = date.toISOString().split("T")[0];

    return {
      id: `v-${idx + 1}`,
      tradingDate: dateString,
      voucherNumber: `VOUCHER-${(idx + 1).toString().padStart(5, "0")}`,
      lines: voucherInfo.lines.map((line) => ({
        id: line.id,
        description: line.particular || "",
        accountingCode: line.accountingCode,
        debitAmount: line.isDebit ? Number(line.amount) : 0,
        creditAmount: !line.isDebit ? Number(line.amount) : 0,
      })),
    };
  });

  // Info: (20260601 - Tzuhan 匯出為 JSON，供 receipt_image_generator.ts 產出圖片
  const outDir = path.resolve(
    process.cwd(),
    "data/6642/2024/inputs/simulated_data/e2e_roadmap-sprint1",
  );
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outPath = path.join(outDir, "simulated_vouchers.json");
  fs.writeFileSync(outPath, JSON.stringify(exportedVouchers, null, 2), "utf8");
  console.log(
    `✅ 已將這 ${allVouchers.length} 筆通過數學嚴格驗證的 Ground Truth 憑證，匯出至 ${outPath}`,
  );
}

runProgressiveVerification().catch(console.error);
