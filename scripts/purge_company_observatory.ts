import * as lancedb from "@lancedb/lancedb";
import path from "path";
import dotenv from "dotenv";
import {
  OBSERVATORY_LANCE_TABLE,
  OBSERVATORY_STORAGE_DIR,
} from "@/constants/company_observatory";
import { FEATURE_FLAG } from "@/constants/feature_flag";
import {
  createLanceTable,
  inspectLanceTable,
} from "@/lib/company_observatory/lance_tables";
import {
  inspectStorageRoot,
  removeStorageRoot,
} from "@/lib/company_observatory/storage";
import { observatoryDocumentRepo } from "@/repositories/observatory_document.repo";
import { reportRepo } from "@/repositories/report.repo";
import { companyFinancialFactRepo } from "@/repositories/company_financial_fact.repo";
import { observatoryVectorRepo } from "@/repositories/observatory_vector.repo";
import { isFeatureEnabled } from "@/services/feature_flag.service";
import {
  createObservatoryPurgeService,
  IObservatoryPurgeCounts,
  ObservatoryPurgeRefusedError,
} from "@/services/company_observatory/observatory_purge.service";

dotenv.config();

const dbUri = process.env.LANCEDB_URI || "./.lancedb_data";
const CONFIRM_FLAG = "--yes";

/**
 * Info: (20261028 - Luphia) 清空企業觀測站下載的資料與檔案。
 * Command: npm run purge_company_observatory            （只列出會刪除的內容，不刪）
 *          npm run purge_company_observatory -- --yes   （真的刪除）
 *
 * 會清除：ObservatoryDocument 全部列、data/company_observatory/ 原始檔、LanceDB company_observatory_chunks
 * （重建為空表）、pdfPath 以 observatory/ 開頭的 Report 列、CompanyFinancialFact 全部列。
 * 不會動：公司字典 Company、手動匯入的報告與 pdfs/、company_reports 向量表、計費紀錄。
 *
 * 後台的企業觀測站開關（BUSINESS_MONITOR_ENABLED）開著時拒絕執行：worker 下一輪就會全部重新下載。
 * 刪除無法復原；之後重新開啟開關，worker 會從頭規劃與下載。
 */

function describe(counts: IObservatoryPurgeCounts): string {
  const megabytes = (counts.bytes / (1024 * 1024)).toFixed(1);
  return [
    `  下載狀態（ObservatoryDocument）：${counts.documents} 列`,
    `  原始檔（${OBSERVATORY_STORAGE_DIR}）：${counts.files} 個，${megabytes} MB`,
    `  向量切塊（LanceDB ${OBSERVATORY_LANCE_TABLE}）：${counts.chunks} 筆`,
    `  企業觀測站頁面的報告（Report，pdfPath 以 observatory/ 開頭）：${counts.reports} 列`,
    `  財務數字（CompanyFinancialFact）：${counts.financialFacts} 列`,
  ].join("\n");
}

async function main() {
  const confirmed = process.argv.includes(CONFIRM_FLAG);
  const db = await lancedb.connect(path.resolve(dbUri));

  const service = createObservatoryPurgeService({
    isEnabled: () => isFeatureEnabled(FEATURE_FLAG.BUSINESS_MONITOR),
    documents: observatoryDocumentRepo,
    reports: reportRepo,
    financialFacts: companyFinancialFactRepo,
    chunks: {
      countRows: () => observatoryVectorRepo.countRows(),
      // Info: (20261028 - Luphia) 以目前維度重建為空表（附全文索引）；表不存在就不必建
      async clear() {
        const status = await inspectLanceTable(db, OBSERVATORY_LANCE_TABLE);
        if (status.exists) {
          await createLanceTable(db, OBSERVATORY_LANCE_TABLE, "overwrite");
        }
      },
    },
    files: {
      inspect: () => inspectStorageRoot(),
      remove: () => removeStorageRoot(),
    },
  });

  if (!confirmed) {
    const counts = await service.inspect();
    console.log(`🔎 [Purge] 演練模式，以下內容會被刪除：\n${describe(counts)}`);
    console.log(
      `ℹ️  [Purge] 確認無誤後加上 ${CONFIRM_FLAG} 執行：npm run purge_company_observatory -- ${CONFIRM_FLAG}`,
    );
    return;
  }

  const removed = await service.purge();
  console.log(`🗑️  [Purge] 已清空企業觀測站：\n${describe(removed)}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    if (error instanceof ObservatoryPurgeRefusedError) {
      console.error(
        "⛔ [Purge] 企業觀測站目前是開啟的，拒絕清空：請先由後台「系統設定 → 功能開關」把 BUSINESS_MONITOR_ENABLED 改為關閉並簽章，否則 worker 會立刻重新下載。",
      );
    } else {
      console.error("❌ [Purge] 執行失敗:", error);
    }
    process.exit(1);
  });
