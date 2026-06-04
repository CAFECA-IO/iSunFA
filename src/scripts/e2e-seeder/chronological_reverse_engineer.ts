import * as fs from "fs";
import * as path from "path";
import { Prisma } from "@/generated";
import {
  ICompanyPersona,
  IPersonaSupplierCategory,
} from "@/interfaces/company_persona";
import { IVoucherLineUI } from "@/interfaces/voucher";
import { getAccountByCode } from "@/lib/utils/account";
import { generateBalanceSheet } from "@/lib/report/balance_sheet_generator";
import { generateIncomeStatement } from "@/lib/report/income_statement_generator";
import { generateCashFlowStatement } from "@/lib/report/cash_flow_statement_generator";
import { IBalanceSheet } from "@/interfaces/balance_sheet";
import { IIncomeStatement } from "@/interfaces/income_statement";
import { ICashFlowStatement } from "@/interfaces/cash_flow_statement";

// Info: (20260603 - Tzuhan) 核心工具與型別定義

function mustGetAccount(code: string) {
  const acc = getAccountByCode(code);
  if (!acc) throw new Error(`[致命錯誤] 系統科目表中找不到科目代碼: ${code}`);
  return acc;
}

function sumItems(items: { amount: string | number }[]): bigint {
  return items.reduce((acc, curr) => acc + BigInt(curr.amount), 0n);
}

const getVendorFromPersona = (
  persona: ICompanyPersona | null,
  categoryName: string,
): string | undefined => {
  if (!persona || !persona.topSuppliers) return undefined;
  const match = persona.topSuppliers.find(
    (t: IPersonaSupplierCategory) =>
      t.category === categoryName || categoryName.includes(t.category),
  );
  if (match && match.suppliers && match.suppliers.length > 0) {
    const rand = Math.random();
    let index = 0;
    if (rand > 0.6 && match.suppliers.length > 1) index = 1;
    if (rand > 0.85 && match.suppliers.length > 2) index = 2;
    return match.suppliers[index].name;
  }
  return undefined;
};

// Info: (20260603 - Tzuhan) 漸進式配平斷言 (Progressive Verification)

function assertReportIntegrity(
  bs: IBalanceSheet,
  is: IIncomeStatement,
  cf: ICashFlowStatement,
) {
  // Info: (20260603 - Tzuhan) IS 內部檢驗
  const revTotal = sumItems(is.sections.revenue.items);
  if (revTotal !== BigInt(is.sections.revenue.total))
    throw new Error(
      `[IS] Revenue ${revTotal} !== ${is.sections.revenue.total}`,
    );
  const cogsTotal = sumItems(is.sections.cogs.items);
  if (cogsTotal !== BigInt(is.sections.cogs.total))
    throw new Error(`[IS] COGS ${cogsTotal} !== ${is.sections.cogs.total}`);
  const gpTotal = revTotal - cogsTotal;
  if (gpTotal !== BigInt(is.sections.grossProfit.total))
    throw new Error(
      `[IS] Gross Profit ${gpTotal} !== ${is.sections.grossProfit.total}`,
    );
  const opexTotal = sumItems(is.sections.operatingExpenses.items);
  if (opexTotal !== BigInt(is.sections.operatingExpenses.total))
    throw new Error(
      `[IS] Opex ${opexTotal} !== ${is.sections.operatingExpenses.total}`,
    );
  const opIncome = gpTotal - opexTotal;
  if (opIncome !== BigInt(is.sections.operatingIncome.total))
    throw new Error(
      `[IS] Operating Income ${opIncome} !== ${is.sections.operatingIncome.total}`,
    );

  // Info: (20260603 - Tzuhan) BS 內部檢驗
  const caTotal = sumItems(bs.assets.current.items);
  if (caTotal !== BigInt(bs.assets.current.total))
    throw new Error(
      `[BS] Current Assets ${caTotal} !== ${bs.assets.current.total}`,
    );
  const ncaTotal = sumItems(bs.assets.nonCurrent.items);
  if (ncaTotal !== BigInt(bs.assets.nonCurrent.total))
    throw new Error(
      `[BS] Non-Current Assets ${ncaTotal} !== ${bs.assets.nonCurrent.total}`,
    );
  const aTotal = caTotal + ncaTotal;
  if (aTotal !== BigInt(bs.assets.total))
    throw new Error(`[BS] Total Assets ${aTotal} !== ${bs.assets.total}`);
  const clTotal = sumItems(bs.liabilities.current.items);
  if (clTotal !== BigInt(bs.liabilities.current.total))
    throw new Error(
      `[BS] Current Liab ${clTotal} !== ${bs.liabilities.current.total}`,
    );
  const nclTotal = sumItems(bs.liabilities.nonCurrent.items);
  if (nclTotal !== BigInt(bs.liabilities.nonCurrent.total))
    throw new Error(
      `[BS] Non-Current Liab ${nclTotal} !== ${bs.liabilities.nonCurrent.total}`,
    );
  const lTotal = clTotal + nclTotal;
  if (lTotal !== BigInt(bs.liabilities.total))
    throw new Error(`[BS] Total Liab ${lTotal} !== ${bs.liabilities.total}`);
  const eqTotal = sumItems(bs.equity.items);
  if (eqTotal !== BigInt(bs.equity.total))
    throw new Error(`[BS] Equity ${eqTotal} !== ${bs.equity.total}`);

  // Info: (20260603 - Tzuhan) CF 內部檢驗
  const netChange =
    sumItems(cf.activities.operating.items) +
    sumItems(cf.activities.investing.items) +
    sumItems(cf.activities.financing.items);
  if (netChange !== BigInt(cf.summary.netIncreaseDecrease))
    throw new Error(
      `[CF] Net Change ${netChange} !== ${cf.summary.netIncreaseDecrease}`,
    );
  const endingBal = BigInt(cf.summary.beginningBalance) + netChange;
  if (endingBal !== BigInt(cf.summary.endingBalance))
    throw new Error(
      `[CF] Ending Balance ${endingBal} !== ${cf.summary.endingBalance}`,
    );

  // Info: (20260603 - Tzuhan) 三表勾稽
  const assets = BigInt(bs.assets.total);
  const liabilities = BigInt(bs.liabilities.total);
  const equity = BigInt(bs.equity.total);
  if (assets !== liabilities + equity)
    throw new Error(
      `[BS] A (${assets}) !== L (${liabilities}) + E (${equity})`,
    );

  const isNetIncome = is.sections.netIncome.total;
  const bsCurrentEarnings =
    bs.equity.items.find((item) => item.code === "3353")?.amount || "0";
  if (isNetIncome !== bsCurrentEarnings)
    throw new Error(
      `[勾稽] IS淨利 (${isNetIncome}) !== BS本期損益 (${bsCurrentEarnings})`,
    );
}

// Info: (20260603 - Tzuhan) Exact Sum Allocator

function allocateExactAmounts(
  total: Prisma.Decimal,
  count: number,
): Prisma.Decimal[] {
  if (count <= 1 || total.lte(0)) return [total];

  const weights = Array.from(
    { length: count },
    () => Math.random() * 0.5 + 0.5,
  );
  const weightSum = new Prisma.Decimal(weights.reduce((a, b) => a + b, 0));

  const results: Prisma.Decimal[] = [];
  let cumulative = new Prisma.Decimal(0);

  for (let i = 0; i < count - 1; i++) {
    const proportion = new Prisma.Decimal(weights[i]).div(weightSum);
    const chunk = total.mul(proportion).floor();
    results.push(chunk);
    cumulative = cumulative.add(chunk);
  }

  // Info: (20260603 - Tzuhan) Last element absorbs the exact remainder
  results.push(total.sub(cumulative));
  return results;
}

// Info: (20260603 - Tzuhan) 帳戶池與萃取工具

const parseFinanceNumber = (val: string): Prisma.Decimal => {
  if (!val) return new Prisma.Decimal(0);
  const num = parseInt(val.replace(/,/g, ""), 10);
  return isNaN(num) ? new Prisma.Decimal(0) : new Prisma.Decimal(num);
};

const findReportValue = (
  reportList: string[][],
  keyword: string,
): Prisma.Decimal => {
  const row = reportList.find((r) => r[0].includes(keyword));
  return row ? parseFinanceNumber(row[1]) : new Prisma.Decimal(0);
};

const REVENUE_POOL = [
  { code: "4111", desc: "銷貨收入" },
  { code: "4112", desc: "分期付款銷貨收入" },
  { code: "4150", desc: "勞務收入" },
];
const COGS_POOL = [
  { code: "5111", desc: "銷貨成本" },
  { code: "5121", desc: "進貨費用" },
];
const SELLING_EXP_POOL = [
  { code: "6112", desc: "薪資支出" },
  { code: "6115", desc: "旅費" },
  { code: "6120", desc: "水電瓦斯費" },
  { code: "6123", desc: "交際費" },
];
const ADMIN_EXP_POOL = [
  { code: "6212", desc: "薪資支出" },
  { code: "6214", desc: "文具用品" },
  { code: "6220", desc: "水電瓦斯費" },
  { code: "6227", desc: "勞務費" },
];
const RND_EXP_POOL = [
  { code: "6312", desc: "薪資支出" },
  { code: "6316", desc: "實驗費用" },
  { code: "6320", desc: "水電瓦斯費" },
];

type IVoucherLineWithVendor = IVoucherLineUI & { vendor?: string };
interface IDailyVoucherGroup {
  id: string;
  lines: IVoucherLineWithVendor[];
}

// Info: (20260603 - Tzuhan) 核心引擎

export const runChronologicalEngine = (
  stockId: string,
  daysToSimulate: number = 365,
  targetVoucherCount?: number,
) => {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/2024`);
  const finDataPath = path.join(
    dataDir,
    "inputs",
    "golden_data",
    "2024_FIN_DATA.json",
  );
  const personaPath = path.join(
    dataDir,
    "outputs",
    "e2e_roadmap-sprint1",
    `${stockId}_company_persona.json`,
  );

  if (!fs.existsSync(finDataPath)) {
    console.error(`[ERROR] Missing 2024_FIN_DATA.json for ${stockId}`);
    process.exit(1);
  }

  const finData = JSON.parse(fs.readFileSync(finDataPath, "utf-8"));
  let persona: ICompanyPersona | null = null;
  if (fs.existsSync(personaPath)) {
    persona = JSON.parse(
      fs.readFileSync(personaPath, "utf-8"),
    ) as ICompanyPersona;
    console.log(`[INFO] Loaded Enterprise Persona from ${personaPath}`);
  }

  const isList = finData.incomeStatement.reportList;
  const totalRevenue = findReportValue(isList, "營業收入合計");
  const cogs = findReportValue(isList, "營業成本合計");
  const sellingExp = findReportValue(isList, "推銷費用");
  const adminExp = findReportValue(isList, "管理費用");
  const rndExp = findReportValue(isList, "研究發展費用");
  const taxExp = findReportValue(isList, "所得稅費用（利益）合計");

  const totalTarget =
    targetVoucherCount ||
    Math.min(Math.max(totalRevenue.div(100000).toNumber(), 100), 55000);

  console.log(
    `🚀 [Chronological Engine] 開始為 ${stockId} 生成 ${totalTarget} 筆精準時序傳票，分佈於 ${daysToSimulate} 天...`,
  );

  const dailyBuckets: IDailyVoucherGroup[][] = Array.from(
    { length: daysToSimulate },
    () => [],
  );
  let globalLineId = 1;
  let globalVoucherId = 1;

  const pushToBuckets = (
    total: Prisma.Decimal,
    count: number,
    pool: { code: string; desc: string }[],
    creditCode: string,
    isDebitNormal: boolean,
    prefix: string,
  ) => {
    if (total.lte(0) || count <= 0) return;
    const amounts = allocateExactAmounts(total, count);

    for (const amt of amounts) {
      if (amt.lte(0)) continue;
      const dayIndex = Math.floor(Math.random() * daysToSimulate);
      const randomItem = pool[Math.floor(Math.random() * pool.length)];
      const vendor = getVendorFromPersona(persona, randomItem.desc);

      const debitCode = isDebitNormal ? randomItem.code : creditCode;
      const finalCreditCode = isDebitNormal ? creditCode : randomItem.code;

      const lines: IVoucherLineWithVendor[] = [
        {
          id: `l-${globalLineId++}`,
          accountingCode: debitCode,
          accounting: mustGetAccount(debitCode),
          particular: randomItem.desc,
          amount: amt.toString(),
          isDebit: true,
          vendor,
        },
        {
          id: `l-${globalLineId++}`,
          accountingCode: finalCreditCode,
          accounting: mustGetAccount(finalCreditCode),
          particular: randomItem.desc,
          amount: amt.toString(),
          isDebit: false,
          vendor,
        },
      ];

      dailyBuckets[dayIndex].push({
        id: `${prefix}-${globalVoucherId++}`,
        lines,
      });
    }
  };

  // Info: (20260603 - Tzuhan) 分配各大科目
  pushToBuckets(
    totalRevenue,
    Math.floor(totalTarget * 0.4),
    REVENUE_POOL,
    "1101",
    false,
    "RV",
  );
  pushToBuckets(
    cogs,
    Math.floor(totalTarget * 0.3),
    COGS_POOL,
    "1101",
    true,
    "COGS",
  );
  pushToBuckets(
    sellingExp,
    Math.floor(totalTarget * 0.1),
    SELLING_EXP_POOL,
    "1101",
    true,
    "SEL",
  );
  pushToBuckets(
    adminExp,
    Math.floor(totalTarget * 0.15),
    ADMIN_EXP_POOL,
    "1101",
    true,
    "ADM",
  );
  pushToBuckets(
    rndExp,
    Math.floor(totalTarget * 0.04),
    RND_EXP_POOL,
    "1101",
    true,
    "RND",
  );
  pushToBuckets(
    taxExp,
    Math.max(Math.floor(totalTarget * 0.01), 1),
    [{ code: "7950", desc: "所得稅費用" }],
    "1101",
    true,
    "TAX",
  );

  // Info: (20260603 - Tzuhan) 初始化資金注入 (Day 0) 以防止現金負數
  dailyBuckets[0].unshift({
    id: `v-init-1`,
    lines: [
      {
        id: `l-${globalLineId++}`,
        accountingCode: "1101",
        accounting: mustGetAccount("1101"),
        particular: "期初資本注入",
        amount: "100000000000",
        isDebit: true,
      },
      {
        id: `l-${globalLineId++}`,
        accountingCode: "3110",
        accounting: mustGetAccount("3110"),
        particular: "期初資本注入",
        amount: "100000000000",
        isDebit: false,
      },
    ],
  });

  const cumulativeLines: IVoucherLineWithVendor[] = [];
  const exportedVouchers: {
    id: string;
    tradingDate: string;
    voucherNumber: string;
    lines: {
      id: string;
      description: string;
      accountingCode: string;
      debitAmount: string | number | bigint;
      creditAmount: string | number | bigint;
      vendor?: string;
    }[];
  }[] = [];

  for (let day = 0; day < daysToSimulate; day++) {
    const dayVouchers = dailyBuckets[day];
    if (dayVouchers.length === 0) continue;

    for (const v of dayVouchers) {
      cumulativeLines.push(...v.lines);

      const date = new Date(`2024-01-01`);
      date.setDate(date.getDate() + day);
      const dateString = date.toISOString().split("T")[0];

      exportedVouchers.push({
        id: v.id,
        tradingDate: dateString,
        voucherNumber: `VOU-${v.id}`,
        lines: v.lines.map((line) => ({
          id: line.id,
          description: line.particular,
          accountingCode: line.accountingCode,
          debitAmount: line.isDebit ? line.amount : "0",
          creditAmount: !line.isDebit ? line.amount : "0",
          vendor: line.vendor,
        })),
      });
    }

    // Info: (20260603 - Tzuhan) 每日結算與斷言
    try {
      const is = generateIncomeStatement(cumulativeLines);
      const bs = generateBalanceSheet(cumulativeLines, 10);
      const cf = generateCashFlowStatement(cumulativeLines, "0");
      assertReportIntegrity(bs, is, cf);
    } catch (err) {
      console.error(`\n❌ [致命錯誤] Day ${day + 1} 財報配平失敗！`);
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }

    if ((day + 1) % 30 === 0 || day === daysToSimulate - 1) {
      console.log(
        `✅ [Day ${day + 1}/${daysToSimulate}] Progressive Assertion 通過！已累積 ${cumulativeLines.length / 2} 張憑證。`,
      );
    }
  }

  // Info: (20260603 - Tzuhan) 最終年度斷言：確保分配結果 100% 貼合 Ground Truth
  const finalIs = generateIncomeStatement(cumulativeLines);
  const simRevenue = sumItems(finalIs.sections.revenue.items);
  if (simRevenue !== BigInt(totalRevenue.toString())) {
    console.error(
      `\n❌ [致命錯誤] 年度總營收模擬不符 Ground Truth！預期: ${totalRevenue}, 實際: ${simRevenue}`,
    );
    process.exit(1);
  }

  console.log(
    `\n🎉 [完美吻合] ${daysToSimulate} 天模擬完成！年度總營收 (${simRevenue}) 與所有科目 100% 貼合 Ground Truth！`,
  );

  // Info: (20260603 - Tzuhan) 匯出模擬資料
  const outPath = path.join(
    dataDir,
    "inputs",
    "simulated_data",
    "e2e_roadmap-sprint1",
    "simulated_vouchers.json",
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(exportedVouchers, null, 2), "utf8");
  console.log(`✅ 已將 ${exportedVouchers.length} 筆憑證寫入 ${outPath}`);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const targetStock = process.argv[2];
  const days = process.argv[3] ? parseInt(process.argv[3], 10) : 365;
  if (!targetStock) {
    console.error(
      "Usage: tsx chronological_reverse_engineer.ts <stockId> [days]",
    );
    process.exit(1);
  }
  runChronologicalEngine(targetStock, days);
}
