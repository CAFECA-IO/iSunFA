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
  inspectLanceTable,
  LEGACY_LANCE_TABLE,
  MANAGED_LANCE_TABLES,
} from "@/lib/company_observatory/lance_tables";
import { observatoryDocumentRepo } from "@/repositories/observatory_document.repo";

dotenv.config();

const dbUri = process.env.LANCEDB_URI || "./.lancedb_data";
const FORCE_FLAG = "--force";

/**
 * Info: (20261015 - Luphia) 換嵌入模型後重建 LanceDB 切塊表並重新索引。
 * Command: npm run reindex_lance_db [-- --force]
 *
 * 1. 找出維度與目前嵌入模型（OBSERVATORY_EMBED_*）不同的表（`--force` 則全部）。
 * 2. 企業觀測站表要重建，就先把 ObservatoryDocument 中已索引的文件排回 DOWNLOADED、清掉 indexedHash；
 *    worker 的索引迴圈會讀本機原始檔重新切塊與嵌入，不會重新下載。
 * 3. 以新維度把這些表重建為空表（企業觀測站表附全文索引）。
 * 4. 手動匯入表（company_reports）重建後是空的，原本的切塊得重新跑 scripts/import_pdfs.ts。
 *
 * 維度相同、沒加 `--force` 時什麼都不做，重跑安全。執行前請先 `ollama pull` 新模型。
 */
async function main() {
  const force = process.argv.includes(FORCE_FLAG);
  const db = await lancedb.connect(path.resolve(dbUri));
  console.log(
    `🛠️  [Reindex] 嵌入模型 ${OBSERVATORY_EMBED_MODEL}（${OBSERVATORY_EMBED_DIMENSION} 維）${force ? "，強制重建" : ""}`,
  );

  const statuses = await Promise.all(
    MANAGED_LANCE_TABLES.map((name) => inspectLanceTable(db, name)),
  );
  const toRebuild = statuses.filter(
    (status) => !status.exists || status.needsRebuild || force,
  );
  for (const status of statuses) {
    if (!toRebuild.includes(status)) {
      console.log(
        `ℹ️  [Reindex] ${status.name} 已是 ${status.dimension} 維，跳過。`,
      );
    }
  }

  /**
   * Info: (20261015 - Luphia) 先把文件排回待索引、再重建表：若重建途中失敗，重跑時表仍是舊維度，
   * 會再走一次完整流程；反過來的順序在「表已重建、排程失敗」時，重跑會因維度已對而跳過，
   * 文件就永遠停在 INDEXED、卻沒有任何切塊。兩步之間 worker 若剛好醒來，寫入時的維度檢查會讓索引暫停。
   */
  if (toRebuild.some((status) => status.name === OBSERVATORY_LANCE_TABLE)) {
    const requeued = await observatoryDocumentRepo.requeueIndexedForReindex(
      new Date(),
    );
    console.log(
      `✅ [Reindex] ${requeued} 份企業觀測站文件已排回待索引，worker 下一輪起會重新索引。`,
    );
  }

  const rebuilt: string[] = [];
  for (const status of toRebuild) {
    await createLanceTable(
      db,
      status.name,
      status.exists ? "overwrite" : "create",
    );
    rebuilt.push(status.name);
    console.log(
      `✅ [Reindex] ${status.name} 已重建（${status.dimension ?? "無"} → ${OBSERVATORY_EMBED_DIMENSION} 維）。`,
    );
  }

  if (rebuilt.includes(LEGACY_LANCE_TABLE)) {
    console.warn(
      `⚠️  [Reindex] ${LEGACY_LANCE_TABLE} 已清空：手動匯入的報告請重新執行 npx tsx scripts/import_pdfs.ts。`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ [Reindex] 執行失敗:", error);
    process.exit(1);
  });
