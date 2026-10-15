import * as lancedb from "@lancedb/lancedb";
import path from "path";
import dotenv from "dotenv";
import {
  OBSERVATORY_EMBED_DIMENSION,
  OBSERVATORY_EMBED_MODEL,
  OBSERVATORY_LANCE_TABLE,
} from "@/constants/company_observatory";
import {
  createLanceTable,
  ensureObservatoryFtsIndex,
  inspectLanceTable,
  MANAGED_LANCE_TABLES,
} from "@/lib/company_observatory/lance_tables";

dotenv.config();

const dbUri = process.env.LANCEDB_URI || "./.lancedb_data";

/**
 * Info: (20260612 - Julian) LanceDB 初始化：建立資料表，並加入一筆初始資料
 * Command: npx tsx scripts/init_lance_db.ts
 *
 * Info: (20261015 - Luphia) 兩張切塊表（company_reports、company_observatory_chunks）都在這裡建立，
 * 欄位與建表方式見 src/lib/company_observatory/lance_tables.ts。已存在就跳過，重跑安全；
 * 企業觀測站表另補上全文索引（舊環境升級時表已存在、但還沒有索引）。
 *
 * 表的向量維度與目前嵌入模型不同時（換過模型）這裡不會自動刪表——手動匯入的切塊刪了就得重新匯入，
 * 只印出提醒，由人執行 scripts/reindex_lance_db.ts。在那之前 AI 諮詢的向量檢索會失敗（已有降級處理），
 * 企業觀測站的索引會暫停，不會把文件打進死信。
 */
async function runMigration() {
  console.log("🛠️  [Migration] 開始檢查並初始化 LanceDB...");

  try {
    const db = await lancedb.connect(path.resolve(dbUri));

    for (const name of MANAGED_LANCE_TABLES) {
      const status = await inspectLanceTable(db, name);
      if (!status.exists) {
        await createLanceTable(db, name, "create");
        console.log(`✅ [Migration] ${name} 資料表初始化成功！`);
        continue;
      }
      if (status.needsRebuild) {
        console.warn(
          `⚠️  [Migration] ${name} 的向量維度為 ${status.dimension ?? "（無法讀取）"}，目前嵌入模型 ${OBSERVATORY_EMBED_MODEL} 是 ${OBSERVATORY_EMBED_DIMENSION} 維。` +
            `請執行 npm run reindex_lance_db 重建資料表並重新索引。`,
        );
      } else {
        console.log(`ℹ️  [Migration] ${name} 資料表已存在，跳過初始化。`);
      }
      /**
       * Info: (20261015 - Luphia) 全文索引與維度無關，舊維度的表也補上：重建之前 AI 諮詢的向量檢索會失敗，
       * 至少還有全文檢索可用。打不開的殘缺表就跳過。
       */
      if (name === OBSERVATORY_LANCE_TABLE && status.dimension !== null) {
        if (await ensureObservatoryFtsIndex(await db.openTable(name))) {
          console.log(`✅ [Migration] ${name} 已補上全文索引。`);
        }
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ [Migration] 初始化腳本執行失敗:", error);
    process.exit(1);
  }
}

runMigration();
