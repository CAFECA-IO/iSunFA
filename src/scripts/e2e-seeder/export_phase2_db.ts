import * as fs from "fs";
import * as path from "path";
import { prisma } from "@/lib/prisma";

export const exportPhase2Db = async (stockId: string) => {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/2024`);
  const outDir = path.join(
    dataDir,
    "inputs",
    "simulated_data",
  );
  const dumpPath = path.join(outDir, "db_dump_vouchers.json");

  console.log(`\n======================================================`);
  console.log(`📤 [PHASE 2] Exporting DB Vouchers & ESG for ${stockId}`);
  console.log(`======================================================`);

  const accountBook = await prisma.accountBook.findUnique({
    where: { id: `e2e-book-${stockId}` },
  });

  if (!accountBook) {
    console.error(`[ERROR] E2E Company E2E-${stockId} not found in DB.`);
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

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
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
      const books = await prisma.accountBook.findMany({
        where: { id: { startsWith: "e2e-book-" } },
      });
      console.log(`Found ${books.length} E2E account books to export.`);
      for (const b of books) {
        const sId = b.id.replace("e2e-book-", "");
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
