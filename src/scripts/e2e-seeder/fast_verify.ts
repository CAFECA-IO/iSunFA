/**
 * Info: (20260505 - Tzuhan)
 * 這支腳本是「秒速核心測試工具」，它的用途與完整的 `run_pipeline.ts` 有著明確的分工：

*   **使用時機**：當只修改 **「核心運算引擎」**（例如：`balance_sheet_generator.ts`, `income_statement_generator.ts`, `math.ts` 裡的加減乘除邏輯）時。
*   **優勢**：它完全跳過耗時 10 分鐘且耗費 Token 的 AI 解析階段，直接把標準答案（`simulated_vouchers.json`）在 **0.1 秒內**灌入 DB，並立刻啟動 Cross Validator 計算誤差。
*   **簡單的黃金守則**：
    *   改了 **AI Prompts** 或 **圖片長相** ➡️ 跑 `run_pipeline.ts` (測試 AI 眼力)。
    *   改了 **財報公式** 或 **會計科目邏輯** ➡️ 跑 `fast_verify.ts` (測試數學引擎)。
 */
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { Prisma, EsgScope, AIAnalysisStatus } from "@/generated";
import { MeasurementUnit } from "@/constants/enums";
import { runCrossValidation } from "@/scripts/e2e-seeder/cross_validator";

interface ISimulatedLine {
  id: string;
  description: string;
  accountingCode: string;
  debitAmount: number;
  creditAmount: number;
  esgRecords?: ISimulatedEsg[];
}

interface ISimulatedEsg {
  id: string;
  category: string;
  source: string;
  metricAmount: number;
  metricUnit: string;
  carbonAmount: number;
}

interface ISimulatedVoucher {
  id: string;
  tradingDate: string;
  voucherNumber: string;
  lines: ISimulatedLine[];
  esgRecords?: ISimulatedEsg[];
}

async function fastVerify(stockId: string) {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/2024`);
  const vouchersPath = path.join(
    dataDir,
    "inputs",
    "simulated_data",
    "phase5_articulation_test",
    "simulated_vouchers.json",
  );

  console.log(
    `\n🚀 [FAST VERIFY] Bypassing AI Phase 2... Directly seeding DB from simulated_vouchers.json for ${stockId}`,
  );

  if (!fs.existsSync(vouchersPath)) {
    console.error("❌ simulated_vouchers.json not found!");
    process.exit(1);
  }

  const vouchersData = JSON.parse(fs.readFileSync(vouchersPath, "utf-8"));
  const accountBookId = `e2e-book-${stockId}`;

  // Info: (20260505 - Tzuhan) 1. Clean DB
  console.log("🧹 Cleaning old DB records...");
  const existingVouchers = await prisma.voucher.findMany({
    where: { accountBookId },
    select: { id: true },
  });
  if (existingVouchers.length > 0) {
    const voucherIds = existingVouchers.map((v: { id: string }) => v.id);
    await prisma.voucherLine.deleteMany({
      where: { voucherId: { in: voucherIds } },
    });
    await prisma.voucher.deleteMany({ where: { id: { in: voucherIds } } });
  }
  await prisma.esgRecord.deleteMany({ where: { accountBookId } });

  // Info: (20260505 - Tzuhan) 2. Insert Vouchers & ESG directly
  console.log(
    `📥 Inserting ${vouchersData.length} Vouchers and ESG records directly into DB...`,
  );
  for (const v of vouchersData as ISimulatedVoucher[]) {
    const createdVoucher = await prisma.voucher.create({
      data: {
        id: v.id,
        accountBookId,
        tradingDate: new Date(v.tradingDate),
        confidence: 100,
        analysisStatus: "COMPLETED",
      },
    });

    const lineData = v.lines.map((l: ISimulatedLine) => ({
      id: l.id,
      voucherId: createdVoucher.id,
      particular: l.description,
      accountingCode: l.accountingCode,
      amount: l.debitAmount > 0 ? l.debitAmount : l.creditAmount,
      isDebit: l.debitAmount > 0,
    }));
    await prisma.voucherLine.createMany({ data: lineData });

    const esgData: Prisma.EsgRecordCreateManyInput[] = [];
    v.lines.forEach((l: ISimulatedLine) => {
      if (l.esgRecords && l.esgRecords.length > 0) {
        l.esgRecords.forEach((e: ISimulatedEsg) => {
          let formattedScope: EsgScope = EsgScope.SCOPE_3;
          if (e.category.includes("scope1")) formattedScope = EsgScope.SCOPE_1;
          if (e.category.includes("scope2")) formattedScope = EsgScope.SCOPE_2;
          if (e.category.includes("scope3")) formattedScope = EsgScope.SCOPE_3;

          esgData.push({
            id: e.id,
            accountBookId,
            tradingDate: new Date(v.tradingDate),
            scope: formattedScope,
            activityType: e.source || "Unknown",
            vendor: "Test Vendor",
            amount: e.metricAmount || 0,
            unit: (e.metricUnit as MeasurementUnit) || MeasurementUnit.KG,
            emissions: e.carbonAmount || 0,
            confidence: 100,
            analysisStatus: AIAnalysisStatus.COMPLETED,
          });
        });
      }
    });

    if (esgData.length > 0) {
      await prisma.esgRecord.createMany({ data: esgData });
    }
  }

  console.log(
    "✅ DB Seeded with LATEST JSON! Running Cross Validator to test the Engine...",
  );

  // Info: (20260505 - Tzuhan) 3. Run the Cross Validator
  await runCrossValidation(stockId);
}

const targetStock = process.argv[2] || "2330";
fastVerify(targetStock)
  .catch(console.error)
  .finally(() => process.exit(0));
