import * as lancedb from "@lancedb/lancedb";
import path from "path";
import dotenv from "dotenv";
import {
  OBSERVATORY_EMBED_DIMENSION,
  OBSERVATORY_LANCE_TABLE,
} from "@/constants/company_observatory";

dotenv.config();

const dbUri = process.env.LANCEDB_URI || "./.lancedb_data";
const TABLE_NAME = "company_reports";

/**
 * Info: (20261015 - Luphia) 企業觀測站的切塊表（欄位定義見 src/interfaces/company_observatory.ts 的
 * IObservatoryVectorRow）。與 company_reports 分開：欄位不同，混用會讓舊的匯入腳本寫入失敗。
 * 已存在就跳過，重跑安全。
 */
async function ensureObservatoryTable(
  db: lancedb.Connection,
  tableNames: string[],
) {
  if (tableNames.includes(OBSERVATORY_LANCE_TABLE)) {
    console.log(
      `ℹ️  [Migration] ${OBSERVATORY_LANCE_TABLE} 資料表已存在，跳過初始化。`,
    );
    return;
  }
  const seedId = "seed-id";
  await db.createTable(OBSERVATORY_LANCE_TABLE, [
    {
      id: seedId,
      vector: new Float32Array(OBSERVATORY_EMBED_DIMENSION),
      text: "DATABASE_SCHEMA_SEED",
      document_id: "seed",
      stock_id: "seed",
      company_name: "SEED",
      source: "seed",
      year: 0,
      source_url: "",
      page_number: 0,
      chunk_index: 0,
      content_hash: "",
    },
  ]);
  const table = await db.openTable(OBSERVATORY_LANCE_TABLE);
  await table.delete(`id = '${seedId}'`);
  console.log(`✅ [Migration] ${OBSERVATORY_LANCE_TABLE} 資料表初始化成功！`);
}

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

    await ensureObservatoryTable(db, tableNames);

    process.exit(0);
  } catch (error) {
    console.error("❌ [Migration] 初始化腳本執行失敗:", error);
    process.exit(1);
  }
}

runMigration();
