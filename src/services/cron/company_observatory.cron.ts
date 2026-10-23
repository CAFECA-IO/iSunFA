import { logger } from "@/lib/utils/logger";
import { isShuttingDown } from "@/lib/worker/shutdown";
import { OBSERVATORY_DOCUMENT_STATUS } from "@/constants/company_observatory";
import {
  IFinancialSyncSummary,
  IObservatoryIndexSummary,
  IObservatoryProcessSummary,
} from "@/interfaces/company_observatory";
import { createObservatoryHttpClient } from "@/lib/company_observatory/http_client";
import { companyFinancialFactRepo } from "@/repositories/company_financial_fact.repo";
import { syncFinancialFacts } from "@/services/company_observatory/financial_facts.sync.service";
import {
  buildCompanyObservatoryIndexer,
  buildCompanyObservatoryService,
  countObservatoryDocuments,
} from "@/services/company_observatory/company_observatory.runtime";

/**
 * Info: (20261015 - Luphia) 企業觀測站的 worker 排程入口（`scripts/run_worker.ts` 註冊）。
 *
 * - `runCompanyObservatoryPlanner`：每日一次，補建待下載清單、把逾時的公司登記排回刷新。
 * - `runCompanyObservatoryCycle`：每 10 分鐘一輪，先下載一小批、再索引一小批。
 *   兩步放同一支迴圈：下載與索引共用 Company 查詢，也讓「一輪」的流量上限一目了然。
 *
 * 都是冪等的：唯一鍵擋重複建列、條件更新擋重複改寫、內容雜湊擋重複索引，
 * 迴圈被打斷或重跑都只是少做或多檢查一次。關機旗標在每份文件之間檢查，不會中途丟下半份。
 */

export async function runCompanyObservatoryPlanner(): Promise<{
  created: number;
  refreshed: number;
}> {
  return buildCompanyObservatoryService(isShuttingDown).planDocuments();
}

export async function runCompanyObservatoryCycle(): Promise<{
  downloads: IObservatoryProcessSummary;
  index: IObservatoryIndexSummary;
}> {
  const downloads =
    await buildCompanyObservatoryService(isShuttingDown).processDownloads();
  const index =
    await buildCompanyObservatoryIndexer(isShuttingDown).indexBatch();

  if (downloads.attempted > 0 || index.attempted > 0) {
    logger.info(
      `[CompanyObservatory] downloads=${JSON.stringify(downloads)} index=${JSON.stringify(index)}`,
    );
  }
  // Info: (20261015 - Luphia) 死信不會自動重試（CLAUDE.md §6）；有新增時提醒到管理端 requeue
  if (downloads.dead > 0 || index.dead > 0) {
    const totalDead = await countObservatoryDocuments(
      OBSERVATORY_DOCUMENT_STATUS.DEAD,
    );
    logger.warn(
      `[CompanyObservatory] ${downloads.dead + index.dead} document(s) moved to dead letter (total ${totalDead}); see GET /api/v1/admin/company_observatory?status=DEAD`,
    );
  }
  return { downloads, index };
}

/**
 * Info: (20261023 - Luphia) 財務數字：每日抓一次證交所／櫃買中心 OpenAPI 的最新一期並覆寫。
 * OpenAPI 不給歷史，這支每天跑才能把每一期留下來；某支端點失敗不影響其他端點。
 */
export async function runCompanyFinancialFactSync(): Promise<IFinancialSyncSummary> {
  const summary = await syncFinancialFacts({
    http: createObservatoryHttpClient(),
    writeFacts: (facts) => companyFinancialFactRepo.replacePeriods(facts),
    now: () => new Date(),
    shouldStop: isShuttingDown,
  });
  logger.info(`[CompanyFinancialFacts] ${JSON.stringify(summary)}`);
  if (summary.failedEndpoints > 0) {
    logger.warn(
      `[CompanyFinancialFacts] ${summary.failedEndpoints}/${summary.endpoints} endpoint(s) failed; will retry on the next daily run`,
    );
  }
  return summary;
}
