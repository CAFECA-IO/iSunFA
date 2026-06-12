import { lanceDBService } from "@/services/lancedb.service";
import dotenv from "dotenv";
import { ILanceDBRow } from "@/interfaces/lance_db";

dotenv.config();

/**
 * Info: (20260612 - Julian) 檢查 LanceDB 資料表內容
 * Command: npx tsx scripts/check_lance_db.ts
 */
async function inspectDatabase() {
  console.log("🔍 [Debug] 開始檢查 LanceDB 內容...");

  try {
    const table = await lanceDBService.getTable();

    // Info: (20260612 - Julian) 1. 檢查總列數
    const totalRows = await table.countRows();
    console.log(`📊 資料庫目前總列數 (Total Rows): ${totalRows}`);

    if (totalRows <= 1) {
      console.log("⚠️  警告：資料庫裡只有初始化種子資料（或完全空的）。");
      return;
    }

    // Info: (20260612 - Julian) 2. 撈出前 10 筆原始資料
    console.log("\n📋 正在讀取前 10 筆資料內容：");
    const allData = await table.query().limit(10).toArray();

    allData.forEach((row: ILanceDBRow, index: number) => {
      console.log(
        `\n---------------- [資料項目 ${index + 1}] ----------------`,
      );
      console.log(`🆔 ID: ${row.id}`);
      console.log(`🏢 公司名稱 (companyName): ${row.companyName}`);
      console.log(`📄 來源報告 (reportId): ${row.reportId}`);
      console.log(
        `📐 向量維度 (Vector Dimension): ${row.vector ? row.vector.length : 0}`,
      );
      console.log(
        `📝 文字片段前 150 字 (Text): \n"${row.text ? row.text.substring(0, 150) : "無文字"}..."`,
      );
    });
  } catch (error) {
    console.error("❌ 讀取資料庫失敗:", error);
  }
  process.exit(0);
}

inspectDatabase();
