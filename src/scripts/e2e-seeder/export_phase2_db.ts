import * as fs from "fs";
import * as path from "path";
import { prisma } from "@/lib/prisma";

export const exportPhase2Db = async (stockId: string) => {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}`);
  const dumpPath = path.join(dataDir, "db_dump_vouchers.json");

  console.log(`\n======================================================`);
  console.log(`📤 [PHASE 2] Exporting DB Vouchers & ESG for ${stockId}`);
  console.log(`======================================================`);

  const company = await prisma.company.findUnique({
    where: { stockId: `E2E-${stockId}` },
  });

  if (!company) {
    console.error(`[ERROR] E2E Company E2E-${stockId} not found in DB.`);
    process.exit(1);
  }

  const accountBook = await prisma.accountBook.findFirst({
    where: { enterpriseId: company.stockId },
  });

  if (!accountBook) {
    console.error(`[ERROR] No AccountBook found for ${company.stockId}.`);
    process.exit(1);
  }

  const vouchers = await prisma.voucher.findMany({
    where: { accountBookId: accountBook.id },
    include: { lines: true },
  });

  const esgRecords = await prisma.esgRecord.findMany({
    where: { accountBookId: accountBook.id },
  });

  const dumpData = {
    vouchers,
    esgRecords,
  };

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(dumpPath, JSON.stringify(dumpData, null, 2), "utf-8");
  console.log(
    `✅ Successfully exported ${vouchers.length} Vouchers and ${esgRecords.length} ESG Records.`,
  );
  console.log(`📁 Saved to: ${dumpPath}\n`);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const targetStock = process.argv[2];
  if (!targetStock) {
    console.error(
      "Please provide a stock ID or 'all'. Usage: tsx export_phase2_db.ts 1538",
    );
    process.exit(1);
  }

  const run = async () => {
    if (targetStock === "all") {
      const companies = await prisma.company.findMany({
        where: { stockId: { startsWith: "E2E-" } },
      });
      console.log(`Found ${companies.length} E2E companies to export.`);
      for (const c of companies) {
        const sId = c.stockId.replace("E2E-", "");
        await exportPhase2Db(sId);
      }
    } else {
      await exportPhase2Db(targetStock);
    }
  };

  run().then(() => {
    prisma.$disconnect();
    process.exit(0);
  });
}
