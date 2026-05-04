import * as fs from "fs";
import * as path from "path";
import { prisma } from "@/lib/prisma";

export const importPhase2Db = async (stockId: string) => {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}`);
  const dumpPath = path.join(dataDir, "db_dump_vouchers.json");

  console.log(`\n======================================================`);
  console.log(`📥 [PHASE 2] Importing DB Vouchers & ESG for ${stockId}`);
  console.log(`======================================================`);

  if (!fs.existsSync(dumpPath)) {
    console.error(`[ERROR] Dump file not found at ${dumpPath}`);
    process.exit(1);
  }

  const dumpData = JSON.parse(fs.readFileSync(dumpPath, "utf-8"));

  // Info: (20260504 - Tzuhan) 確保資料庫有必需的實體
  const company = await prisma.company.upsert({
    where: { stockId: `E2E-${stockId}` },
    update: {},
    create: {
      stockId: `E2E-${stockId}`,
      name: `E2E Test Enterprise ${stockId}`,
      marketType: "sii",
    },
  });

  const team = await prisma.team.upsert({
    where: { id: `e2e-team-${stockId}` },
    update: {},
    create: {
      id: `e2e-team-${stockId}`,
      name: `E2E Team ${stockId}`,
    },
  });

  const accountBook = await prisma.accountBook.upsert({
    where: { id: `e2e-book-${stockId}` },
    update: {},
    create: {
      id: `e2e-book-${stockId}`,
      name: `2024 Accounting Book`,
      country: "TW",
      currency: "TWD",
      rule: "IFRS",
      enterpriseId: company.stockId,
      teamId: team.id,
    },
  });

  // Info: (20260504 - Tzuhan) 還原傳票紀錄
  let voucherCount = 0;
  for (const v of dumpData.vouchers) {
    await prisma.voucher.create({
      data: {
        accountBookId: accountBook.id,
        tradingDate: new Date(v.tradingDate),
        confidence: v.confidence,
        analysisStatus: v.analysisStatus,
        lines: {
          create: v.lines.map(
            (l: {
              accountingCode: string;
              particular: string;
              amount: number;
              isDebit: boolean;
            }) => ({
              accountingCode: l.accountingCode,
              particular: l.particular,
              amount: l.amount,
              isDebit: l.isDebit,
            }),
          ),
        },
      },
    });
    voucherCount++;
  }

  // Info: (20260504 - Tzuhan) 還原 ESG 紀錄
  let esgCount = 0;
  for (const e of dumpData.esgRecords) {
    await prisma.esgRecord.create({
      data: {
        accountBookId: accountBook.id,
        tradingDate: new Date(e.tradingDate),
        scope: e.scope,
        activityType: e.activityType,
        vendor: e.vendor,
        amount: e.amount,
        unit: e.unit,
        emissions: e.emissions,
        confidence: e.confidence,
        analysisStatus: e.analysisStatus,
      },
    });
    esgCount++;
  }

  console.log(
    `✅ Successfully restored ${voucherCount} Vouchers and ${esgCount} ESG Records without using any AI tokens!`,
  );
  console.log(`======================================================\n`);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const targetStock = process.argv[2];
  if (!targetStock) {
    console.error(
      "Please provide a stock ID or 'all'. Usage: tsx import_phase2_db.ts 1538",
    );
    process.exit(1);
  }

  const run = async () => {
    if (targetStock === "all") {
      // Info: (20260504 - Tzuhan) 尋找 data/ 內所有包含 db_dump_vouchers.json 的目錄
      const dataRoot = path.resolve(process.cwd(), "data");
      if (fs.existsSync(dataRoot)) {
        const dirs = fs.readdirSync(dataRoot);
        for (const dir of dirs) {
          const dumpPath = path.join(dataRoot, dir, "db_dump_vouchers.json");
          if (fs.existsSync(dumpPath)) {
            await importPhase2Db(dir);
          }
        }
      }
    } else {
      await importPhase2Db(targetStock);
    }
  };

  run().then(() => {
    prisma.$disconnect();
    process.exit(0);
  });
}
