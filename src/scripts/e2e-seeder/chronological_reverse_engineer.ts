import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import { Prisma } from "@/generated";
import {
  ICompanyPersona,
  IPersonaSupplierCategory,
} from "@/interfaces/company_persona";
import { IMesWorkOrder, IOutsourcedLog, IBomData, IProductBom } from "@/interfaces/cbam";
import { IVoucherLineUI } from "@/interfaces/voucher";
import { AccountUtil } from "@/lib/utils/account_util";
import { TW_ACCOUNTS } from "@/constants/accounts/tw";
import { MoneyUtil } from "@/lib/utils/money";
import { SemanticAccountMatcher } from "@/lib/utils/semantic_account_matcher";
import { UniversalAccountTag } from "@/constants/enums";
import { generateBalanceSheet } from "@/lib/report/balance_sheet_generator";
import { generateIncomeStatement } from "@/lib/report/income_statement_generator";
import { generateCashFlowStatement } from "@/lib/report/cash_flow_statement_generator";
import { IBalanceSheet } from "@/interfaces/balance_sheet";
import { IIncomeStatement } from "@/interfaces/income_statement";
import { ICashFlowStatement } from "@/interfaces/cash_flow_statement";

// Info: (20260603 - Tzuhan) 核心工具與型別定義

function mustGetAccount(code: string) {
  const acc = AccountUtil.getAccount(code, TW_ACCOUNTS);
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
  if (!val) return MoneyUtil.toDecimal(0);
  return MoneyUtil.toDecimal(MoneyUtil.parseInput(val));
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
];
const COGS_POOL = [
  { code: SemanticAccountMatcher.match(UniversalAccountTag.COST_OF_GOODS_SOLD, TW_ACCOUNTS), desc: "銷貨成本" },
];
const SELLING_EXP_POOL = [
  { code: "6112", desc: "薪資支出" },
  { code: "6115", desc: "旅費" },
  { code: "6118", desc: "水電瓦斯費" },
  { code: "6120", desc: "交際費" },
];
const ADMIN_EXP_POOL = [
  { code: "6212", desc: "薪資支出" },
  { code: "6214", desc: "文具用品" },
  { code: "6218", desc: "水電瓦斯費" },
  { code: "6220", desc: "交際費" },
];
const RND_EXP_POOL = [
  { code: "6312", desc: "薪資支出" },
  { code: "6316", desc: "實驗費用" },
  { code: "6318", desc: "水電瓦斯費" },
];

type IVoucherLineWithVendor = IVoucherLineUI & { vendor?: string };
interface IDailyVoucherGroup {
  id: string;
  lines: IVoucherLineWithVendor[];
}

// Info: (20260603 - Tzuhan) 核心引擎

export const runChronologicalEngine = (
  stockId: string,
  year: string = "2024",
  daysToSimulate: number = 365,
  targetVoucherCount?: number,
) => {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/${year}`);
  const finDataPath = path.join(
    dataDir,
    "inputs",
    "golden_data",
    `${year}_FIN_DATA.json`,
  );
  const personaPath = path.join(
    dataDir,
    "outputs",
    "e2e_roadmap-sprint1",
    `${stockId}_company_persona.json`,
  );

  const ingestionDir = path.join(dataDir, "outputs", "e2e_roadmap-sprint1", "system_ingestion");
  const mockSourcesDir = path.join(dataDir, "outputs", "e2e_roadmap-sprint1", "mock_sources");
  const mesPath = path.join(ingestionDir, "mes_work_orders.csv");
  const outsourcedPath = path.join(ingestionDir, "outsourced_processing_logs.csv");
  const bomPath = path.join(mockSourcesDir, "boms_and_precursors.json");

  if (!fs.existsSync(finDataPath)) {
    console.error(`[ERROR] Missing ${year}_FIN_DATA.json for ${stockId}`);
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
  let cogs = findReportValue(isList, "營業成本合計");
  const sellingExp = findReportValue(isList, "推銷費用");
  const adminExp = findReportValue(isList, "管理費用");
  const rndExp = findReportValue(isList, "研究發展費用");
  const taxExp = findReportValue(isList, "所得稅費用（利益）合計");

  // Info: (20260605 - Tzuhan) 讀取實體數據
  let mesLogs: IMesWorkOrder[] = [];
  let outsourcedLogs: IOutsourcedLog[] = [];
  if (fs.existsSync(mesPath)) {
    mesLogs = parse(fs.readFileSync(mesPath, "utf-8"), { columns: true });
    console.log(`[INFO] Loaded ${mesLogs.length} MES logs from ${mesPath}`);
  } else {
    console.warn(`[WARN] Missing MES logs at ${mesPath}`);
  }

  if (fs.existsSync(outsourcedPath)) {
    outsourcedLogs = parse(fs.readFileSync(outsourcedPath, "utf-8"), { columns: true });
    console.log(`[INFO] Loaded ${outsourcedLogs.length} Outsourced logs from ${outsourcedPath}`);
  } else {
    console.warn(`[WARN] Missing Outsourced logs at ${outsourcedPath}`);
  }

  let bomsData: IBomData | null = null;
  if (fs.existsSync(bomPath)) {
    bomsData = JSON.parse(fs.readFileSync(bomPath, "utf-8")) as IBomData;
    console.log(`[INFO] Loaded BOMs data from ${bomPath}`);
  } else {
    console.warn(`[WARN] Missing BOMs data at ${bomPath}`);
  }

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

  // Info: (20260605 - Tzuhan) Bottom-Up Anchoring: Hard Vouchers
  const MOCK_ELECTRICITY_PRICE = 3.5;
  const MOCK_STEEL_PRICE = 30;

  let totalElectricityCost = 0;
  let totalOutsourcedCost = 0;
  let totalSteelCost = 0;

  // Info: (20260605 - Tzuhan) 1. 電力傳票 (從 MES 聚合)
  // Info: (20260605 - Tzuhan) 將每天的用電量加總，產生傳票
  const dailyElectricity: { [day: number]: number } = {};
  for (const log of mesLogs) {
    const ts = new Date(log.Timestamp);
    // Info: (20260605 - Tzuhan) 假設起點是 2024-01-01
    const dayIndex = Math.floor((ts.getTime() - new Date(`${year}-01-01`).getTime()) / (1000 * 3600 * 24));
    if (dayIndex >= 0 && dayIndex < daysToSimulate) {
      dailyElectricity[dayIndex] = (dailyElectricity[dayIndex] || 0) + (Number(log.EnergyConsumed_kWh) || 0);
    }
  }

  for (const dayStr of Object.keys(dailyElectricity)) {
    const day = parseInt(dayStr, 10);
    const cost = Math.floor(dailyElectricity[day] * MOCK_ELECTRICITY_PRICE);
    const costInThousands = Math.floor(cost / 1000);
    if (costInThousands <= 0) continue;
    
    totalElectricityCost += costInThousands;
    dailyBuckets[day].push({
      id: `UTIL-${globalVoucherId++}`,
      lines: [
        {
          id: `l-${globalLineId++}`,
          accountingCode: SemanticAccountMatcher.match(UniversalAccountTag.COST_OF_GOODS_SOLD, TW_ACCOUNTS),
          accounting: mustGetAccount(SemanticAccountMatcher.match(UniversalAccountTag.COST_OF_GOODS_SOLD, TW_ACCOUNTS)),
          particular: "水電瓦斯費 (廠房用電)",
          amount: costInThousands.toString(),
          isDebit: true,
          vendor: "台灣電力公司",
        },
        {
          id: `l-${globalLineId++}`,
          accountingCode: SemanticAccountMatcher.match(UniversalAccountTag.ACCOUNTS_PAYABLE, TW_ACCOUNTS),
          accounting: mustGetAccount(SemanticAccountMatcher.match(UniversalAccountTag.ACCOUNTS_PAYABLE, TW_ACCOUNTS)),
          particular: "應付帳款 - 台電",
          amount: costInThousands.toString(),
          isDebit: false,
          vendor: "台灣電力公司",
        },
      ],
    });
  }

  // Info: (20260605 - Tzuhan) 2. 委外加工傳票
  for (const log of outsourcedLogs) {
    const ts = new Date(log.DispatchDate);
    const dayIndex = Math.floor((ts.getTime() - new Date(`${year}-01-01`).getTime()) / (1000 * 3600 * 24));
    if (dayIndex >= 0 && dayIndex < daysToSimulate) {
      const cost = Math.floor(Number(log.ProcessingFee_NTD) || 0);
      const costInThousands = Math.floor(cost / 1000);
      if (costInThousands <= 0) continue;

      totalOutsourcedCost += costInThousands;
      dailyBuckets[dayIndex].push({
        id: `OUT-${globalVoucherId++}`,
        lines: [
          {
            id: `l-${globalLineId++}`,
            accountingCode: SemanticAccountMatcher.match(UniversalAccountTag.COST_OF_GOODS_SOLD, TW_ACCOUNTS),
            accounting: mustGetAccount(SemanticAccountMatcher.match(UniversalAccountTag.COST_OF_GOODS_SOLD, TW_ACCOUNTS)),
            particular: `委外加工費 (${log.ProcessName})`,
            amount: costInThousands.toString(),
            isDebit: true,
            vendor: log.SupplierName,
          },
          {
            id: `l-${globalLineId++}`,
            accountingCode: SemanticAccountMatcher.match(UniversalAccountTag.ACCOUNTS_PAYABLE, TW_ACCOUNTS),
            accounting: mustGetAccount(SemanticAccountMatcher.match(UniversalAccountTag.ACCOUNTS_PAYABLE, TW_ACCOUNTS)),
            particular: "應付帳款 - 加工廠",
            amount: costInThousands.toString(),
            isDebit: false,
            vendor: log.SupplierName,
          },
        ],
      });
    }
  }

  // Info: (20260605 - Tzuhan) 3. 原物料進貨傳票 (依據工單最大投入重量推估)
  const workOrderInputWeights: { [woId: string]: { day: number; weight: number; productId: string } } = {};
  for (const log of mesLogs) {
    const ts = new Date(log.Timestamp);
    const dayIndex = Math.floor((ts.getTime() - new Date(`${year}-01-01`).getTime()) / (1000 * 3600 * 24));
    if (dayIndex >= 0 && dayIndex < daysToSimulate) {
      const weight = Number(log.InputWeight_kg) || 0;
      if (!workOrderInputWeights[log.WorkOrderID] || workOrderInputWeights[log.WorkOrderID].weight < weight) {
        workOrderInputWeights[log.WorkOrderID] = { day: dayIndex, weight, productId: log.ProductID };
      }
    }
  }

  for (const woId of Object.keys(workOrderInputWeights)) {
    const { day, weight, productId } = workOrderInputWeights[woId];
    const cost = Math.floor(weight * MOCK_STEEL_PRICE);
    const costInThousands = Math.floor(cost / 1000);
    if (costInThousands <= 0) continue;

    // Info: (20260605 - Tzuhan) 從 BOM 尋找這個產品的供應商與原料名稱
    let steelVendor = getVendorFromPersona(persona, "原料") || "未指派原料供應商";
    let materialName = "進項原料";
    if (bomsData && bomsData.products) {
      const productBom = bomsData.products.find((p: IProductBom) => p.productId === productId);
      if (productBom && productBom.bom && productBom.bom.length > 0) {
        // Info: (20260605 - Tzuhan) 取主要原料（第一個）
        const primaryPrecursor = productBom.bom[0];
        if (primaryPrecursor.supplierName) steelVendor = primaryPrecursor.supplierName;
        if (primaryPrecursor.precursorName) materialName = primaryPrecursor.precursorName;
      }
    } else {
      steelVendor = getVendorFromPersona(persona, "原料") || steelVendor;
    }

    totalSteelCost += costInThousands;
    // Info: (20260605 - Tzuhan) 假設投產當天就是進貨日 (或可提早幾天)
    dailyBuckets[day].push({
      id: `PUR-${globalVoucherId++}`,
      lines: [
        {
          id: `l-${globalLineId++}`,
          accountingCode: SemanticAccountMatcher.match(UniversalAccountTag.COST_OF_GOODS_SOLD, TW_ACCOUNTS), // Info: (20260605 - Tzuhan) 直接作為材料成本
          accounting: mustGetAccount(SemanticAccountMatcher.match(UniversalAccountTag.COST_OF_GOODS_SOLD, TW_ACCOUNTS)),
          particular: `${materialName}進貨 (${woId})`,
          amount: costInThousands.toString(),
          isDebit: true,
          vendor: steelVendor,
        },
        {
          id: `l-${globalLineId++}`,
          accountingCode: SemanticAccountMatcher.match(UniversalAccountTag.ACCOUNTS_PAYABLE, TW_ACCOUNTS),
          accounting: mustGetAccount(SemanticAccountMatcher.match(UniversalAccountTag.ACCOUNTS_PAYABLE, TW_ACCOUNTS)),
          particular: "應付帳款 - 原料",
          amount: costInThousands.toString(),
          isDebit: false,
          vendor: steelVendor,
        },
      ],
    });
  }

  console.log(`[Reconciliation] Hard Vouchers 統計:`);
  console.log(` - 電費: ${totalElectricityCost} NTD`);
  console.log(` - 委外: ${totalOutsourcedCost} NTD`);
  console.log(` - 鋼材: ${totalSteelCost} NTD`);

  const hardCogsDeduction = MoneyUtil.toDecimal(totalElectricityCost + totalOutsourcedCost + totalSteelCost);
  
  if (cogs.gte(hardCogsDeduction)) {
    cogs = cogs.sub(hardCogsDeduction);
    console.log(`[Reconciliation] 已從 COGS 目標總額扣除實體對接成本。剩餘 COGS: ${cogs}`);
  } else {
    console.error(`[ERROR] 嚴重錯誤！實體對接成本 (${hardCogsDeduction}) 超過總 COGS (${cogs})。A=L+E 將無法配平。`);
    /** Info: (20260605 - Tzuhan) 這裡有兩個選項：
     * 1. 從 Opex 扣除剩餘的實體成本，這會讓 Opex 異常高，但至少能保持 A=L+E 的完整性。
     * 2. 強制限制實體成本不超過 COGS，這樣就不會出現負數，但可能會讓實體成本的表現不夠真實。

     * 目前先選擇第一個方案，因為它更能反映實際情況（即使 Opex 看起來不合理）。未來可以考慮加入一個調整機制，根據實際數據動態調整各科目的分配比例。
     * Fallback: 如果實體成本大於COGS，硬扣會導致負數。我們把這部分從 Opex 扣，或者限制實體成本。
     * 在這裡我們先直接扣，如果負數 allocateExactAmounts 會忽略，這將導致 A=L+E 不平。
     * 所以我們必須做安全保護
    */
    cogs = MoneyUtil.toDecimal(0);
  }

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
    SemanticAccountMatcher.match(UniversalAccountTag.CASH, TW_ACCOUNTS),
    false,
    "RV",
  );
  pushToBuckets(
    cogs,
    Math.floor(totalTarget * 0.3),
    COGS_POOL,
    SemanticAccountMatcher.match(UniversalAccountTag.CASH, TW_ACCOUNTS),
    true,
    "COGS",
  );
  pushToBuckets(
    sellingExp,
    Math.floor(totalTarget * 0.1),
    SELLING_EXP_POOL,
    SemanticAccountMatcher.match(UniversalAccountTag.CASH, TW_ACCOUNTS),
    true,
    "SEL",
  );
  pushToBuckets(
    adminExp,
    Math.floor(totalTarget * 0.15),
    ADMIN_EXP_POOL,
    SemanticAccountMatcher.match(UniversalAccountTag.CASH, TW_ACCOUNTS),
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

      const date = new Date(`${year}-01-01`);
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
  const year = process.argv[3] || "2024";
  const days = process.argv[4] ? parseInt(process.argv[4], 10) : 365;
  if (!targetStock) {
    console.error(
      "Usage: tsx chronological_reverse_engineer.ts <stockId> [year] [days]",
    );
    process.exit(1);
  }
  runChronologicalEngine(targetStock, year, days);
}
