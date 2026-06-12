import * as lancedb from "@lancedb/lancedb";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const dbUri = process.env.LANCEDB_URI || "./.lancedb_data";
const TABLE_NAME = "company_reports";

/**
 * Info: (20260612 - Julian) LanceDB 初始化：建立資料表，並加入一筆初始資料
 * Command: npx tsx scripts/init_lance_db.ts
 */
async function runMigration() {
  console.log("🛠️  [Migration] 開始檢查並初始化 LanceDB...");

  try {
    const absolutePath = path.resolve(dbUri);
    const db = await lancedb.connect(absolutePath);
    const tableNames = await db.tableNames();

    if (!tableNames.includes(TABLE_NAME)) {
      console.log(`[Migration] 偵測到 ${TABLE_NAME} 資料表不存在，正在建立...`);

      // Info: (20260612 - Julian) 建立新表時必須給予基礎 Schema 定義與一筆初始範例資料
      const schemaSeed = [
        {
          id: "seed-id",
          vector: new Float32Array(768), // Info: (20260612 - Julian) 預留給 Ollama 768 維度 Embedding (如 nomic-embed-text)
          text: "DATABASE_SCHEMA_SEED",
          reportId: "seed",
          companyName: "SEED",
          pageNumber: 0,
        },
      ];

      await db.createTable(TABLE_NAME, schemaSeed);
      console.log(`████████████████████████████████ 100%`);
      console.log(`✅ [Migration] ${TABLE_NAME} 資料表初始化成功！`);

      // Info: (20260612 - Julian) 建立完 Schema 後，立刻刪除這筆全為 0 的假資料，保持資料庫乾淨，避免污染 RAG 搜尋結果
      const table = await db.openTable(TABLE_NAME);
      await table.delete("id = 'seed-id'");
      console.log(`🧹 [Migration] 已清除初始化用的種子假資料。`);
    } else {
      console.log(`ℹ️  [Migration] ${TABLE_NAME} 資料表已存在，跳過初始化。`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ [Migration] 初始化腳本執行失敗:", error);
    process.exit(1);
  }
}

runMigration();
