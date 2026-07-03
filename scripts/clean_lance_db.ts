import { lanceDBService } from "../src/services/lancedb.service";
import { prisma } from "../src/lib/prisma";
import dotenv from "dotenv";

dotenv.config();

/**
 * Info: (20260630 - Julian) 清理 LanceDB 舊資料及孤兒 (Orphaned) 資料
 * 使 LanceDB 僅保留與 PostgreSQL prisma.report 中同步對應的向量區塊
 * Command: npx tsx scripts/clean_lance_db.ts
 */
async function cleanDatabase() {
  console.log("🧹 [Clean] 開始進行 LanceDB 舊資料清理程序...");

  try {
    const table = await lanceDBService.getTable();

    // Info: (20260630 - Julian) 1. 取得 PostgreSQL 中目前所有有效的 Report ID
    const activeReports = await prisma.report.findMany({
      select: { id: true },
    });
    const activeIds = activeReports.map((r) => String(r.id));
    console.log(`📊 PostgreSQL 中有效的報告 ID 列表:`, activeIds);

    // Info: (20260630 - Julian) 2. 取得 LanceDB 目前總列數
    const countBefore = await table.countRows();
    console.log(`📊 刪除前 LanceDB 總列數: ${countBefore}`);

    // Info: (20260630 - Julian) 3. 制定刪除條件
    let deleteQuery = "";
    if (activeIds.length > 0) {
      // Info: (20260630 - Julian) 刪除所有 reportId 不在 PostgreSQL 有效 ID 列表中的資料，並刪除種子資料 (除保留必要的結構外)
      const idListStr = activeIds.map((id) => `'${id}'`).join(", ");
      deleteQuery = `reportId NOT IN (${idListStr})`;
    } else {
      // Info: (20260630 - Julian) 如果 PostgreSQL 中無任何有效報告，則清除所有非種子資料
      deleteQuery = `reportId != 'seed'`;
    }

    console.log(`🔍 [Clean] 執行刪除條件 SQL: ${deleteQuery}`);

    // Info: (20260630 - Julian) 4. 執行刪除
    await table.delete(deleteQuery);
    console.log(`✅ [Clean] 舊資料刪除指令執行完成。`);

    // Info: (20260630 - Julian) 5. 取得刪除後總列數與剩餘資料分布
    const countAfter = await table.countRows();
    console.log(`📊 刪除後 LanceDB 總列數: ${countAfter}`);
    console.log(`📉 共清除了 ${countBefore - countAfter} 筆舊資料向量。`);

    // Info: (20260630 - Julian) 6. 印出剩餘資料結構進行驗證
    if (countAfter > 0) {
      const remainingRows = await table
        .query()
        .select(["reportId", "companyName"])
        .toArray();
      const companyCounts: Record<string, number> = {};
      for (const row of remainingRows) {
        companyCounts[row.companyName] =
          (companyCounts[row.companyName] || 0) + 1;
      }
      console.log("\n📋 刪除後 LanceDB 剩餘公司資料分布:");
      console.dir(companyCounts);
    }
  } catch (error) {
    console.error("❌ 清理 LanceDB 失敗:", error);
  }
  process.exit(0);
}

cleanDatabase();
