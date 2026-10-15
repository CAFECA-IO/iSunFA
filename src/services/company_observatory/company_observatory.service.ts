import {
  OBSERVATORY_DOCUMENT_STATUS,
  OBSERVATORY_DOWNLOAD_BATCH_PER_SOURCE,
  OBSERVATORY_FETCH_OUTCOME,
  OBSERVATORY_PLAN_CREATE_CHUNK,
  OBSERVATORY_REASON,
  OBSERVATORY_REFRESH_AFTER_MS,
  OBSERVATORY_SOURCES,
  ObservatoryContentType,
  ObservatorySource,
} from "@/constants/company_observatory";
import {
  IObservatoryDownloader,
  IObservatoryHttpClient,
  IObservatoryProcessSummary,
  IObservatoryTarget,
} from "@/interfaces/company_observatory";
import {
  IObservatoryPlanRow,
  observatoryDocumentRepo,
} from "@/repositories/observatory_document.repo";
import { sha256Hex } from "@/lib/company_observatory/content";
import { ObservatorySourceThrottledError } from "@/lib/company_observatory/errors";
import {
  minTrackedYear,
  nextRecheckAt,
  nextStateAfterFailure,
  targetYearsFor,
} from "@/lib/company_observatory/retry_policy";
import {
  IObservatoryStorage,
  observatoryFilePath,
} from "@/lib/company_observatory/storage";
import { describeError } from "@/lib/utils/error_message";

/**
 * Info: (20261015 - Luphia) 企業觀測站：規劃與下載。
 *
 * - 規劃（每日）：對每家追蹤中的公司 × 來源 × 年度補建 PENDING 列；唯一鍵保證重跑不重複。
 *   會變動的來源（公司登記）索引逾時就排回下載。
 * - 下載（每 10 分鐘）：每個來源各取一小批到期的文件，交給該來源的下載器。
 *   內容雜湊與上次索引相同 → 直接回到 INDEXED，不寫檔、不重建索引（冪等）。
 *
 * 依賴以參數注入（`createCompanyObservatoryService`），單元測試用記憶體假物件即可驗證狀態流，
 * 不碰 DB 也不連外網。
 */

export type IObservatoryDocumentStore = Pick<
  typeof observatoryDocumentRepo,
  "createPending" | "findDueForDownload" | "transition" | "markStaleForRefresh"
>;

export interface IObservatoryCompany {
  stockId: string;
  name: string;
  abbreviation: string | null;
  marketType: string;
  taxId: string | null;
}

export interface IObservatoryCompanyDirectory {
  listActive(): Promise<IObservatoryCompany[]>;
  findByStockIds(stockIds: string[]): Promise<IObservatoryCompany[]>;
}

export interface ICompanyObservatoryDeps {
  documents: IObservatoryDocumentStore;
  companies: IObservatoryCompanyDirectory;
  downloaders: Record<ObservatorySource, IObservatoryDownloader>;
  http: IObservatoryHttpClient;
  storage: IObservatoryStorage;
  now: () => Date;
  shouldStop: () => boolean;
  log: (message: string) => void;
}

// Info: (20261015 - Luphia) 下載一份文件的結果（彙總用）
export const OBSERVATORY_DOWNLOAD_RESULT = {
  DOWNLOADED: "DOWNLOADED",
  UNCHANGED: "UNCHANGED",
  NOT_AVAILABLE: "NOT_AVAILABLE",
  FAILED: "FAILED",
  DEAD: "DEAD",
  SKIPPED: "SKIPPED",
} as const;

export type ObservatoryDownloadResult =
  (typeof OBSERVATORY_DOWNLOAD_RESULT)[keyof typeof OBSERVATORY_DOWNLOAD_RESULT];

export interface IObservatoryDocumentInput {
  id: string;
  stockId: string;
  source: string;
  year: number;
  status: string;
  attemptCount: number;
  indexedHash: string | null;
}

function isObservatorySource(value: string): value is ObservatorySource {
  return (OBSERVATORY_SOURCES as readonly string[]).includes(value);
}

export function toObservatoryTarget(
  company: IObservatoryCompany,
  year: number,
): IObservatoryTarget {
  return {
    stockId: company.stockId,
    companyName: company.abbreviation || company.name,
    marketType: company.marketType,
    taxId: company.taxId,
    year,
  };
}

// Info: (20261015 - Luphia) 規劃列：純函數，供測試驗證「每家公司各來源該建哪些年度」
export function buildPlanRows(
  companies: IObservatoryCompany[],
  now: Date,
): IObservatoryPlanRow[] {
  const rows: IObservatoryPlanRow[] = [];
  for (const company of companies) {
    for (const source of OBSERVATORY_SOURCES) {
      for (const year of targetYearsFor(source, now)) {
        rows.push({ stockId: company.stockId, source, year });
      }
    }
  }
  return rows;
}

export function createCompanyObservatoryService(deps: ICompanyObservatoryDeps) {
  async function downloadOne(
    doc: IObservatoryDocumentInput,
    company: IObservatoryCompany | undefined,
  ): Promise<ObservatoryDownloadResult> {
    const now = deps.now();
    if (!isObservatorySource(doc.source)) {
      deps.log(`unknown source ${doc.source} on ${doc.id}; skipped`);
      return OBSERVATORY_DOWNLOAD_RESULT.SKIPPED;
    }
    // Info: (20261015 - Luphia) 公司已不在字典裡（下市、代號變更）：當作查無，不計失敗
    if (!company) {
      await deps.documents.transition(doc.id, doc.status, {
        status: OBSERVATORY_DOCUMENT_STATUS.NOT_AVAILABLE,
        lastError: OBSERVATORY_REASON.NO_RECORD,
        nextAttemptAt: nextRecheckAt(now),
      });
      return OBSERVATORY_DOWNLOAD_RESULT.NOT_AVAILABLE;
    }

    try {
      const result = await deps.downloaders[doc.source].fetch(
        toObservatoryTarget(company, doc.year),
        deps.http,
      );

      if (result.outcome === OBSERVATORY_FETCH_OUTCOME.NOT_AVAILABLE) {
        await deps.documents.transition(doc.id, doc.status, {
          status: OBSERVATORY_DOCUMENT_STATUS.NOT_AVAILABLE,
          sourceUrl: result.sourceUrl,
          lastError: result.reason,
          attemptCount: 0,
          nextAttemptAt: nextRecheckAt(now),
        });
        return OBSERVATORY_DOWNLOAD_RESULT.NOT_AVAILABLE;
      }

      const contentHash = sha256Hex(result.body);
      // Info: (20261015 - Luphia) 冪等：與已索引的內容相同就不寫檔、不重建索引
      if (doc.indexedHash === contentHash) {
        await deps.documents.transition(doc.id, doc.status, {
          status: OBSERVATORY_DOCUMENT_STATUS.INDEXED,
          sourceUrl: result.sourceUrl,
          title: result.title,
          contentHash,
          downloadedAt: now,
          attemptCount: 0,
          lastError: null,
          nextAttemptAt: now,
        });
        return OBSERVATORY_DOWNLOAD_RESULT.UNCHANGED;
      }

      const filePath = observatoryFilePath({
        stockId: doc.stockId,
        year: doc.year,
        source: doc.source,
        contentType: result.contentType as ObservatoryContentType,
      });
      await deps.storage.save(filePath, result.body);
      await deps.documents.transition(doc.id, doc.status, {
        status: OBSERVATORY_DOCUMENT_STATUS.DOWNLOADED,
        sourceUrl: result.sourceUrl,
        title: result.title,
        filePath,
        contentType: result.contentType,
        contentHash,
        downloadedAt: now,
        attemptCount: 0,
        lastError: null,
        nextAttemptAt: now,
      });
      return OBSERVATORY_DOWNLOAD_RESULT.DOWNLOADED;
    } catch (error) {
      // Info: (20261015 - Luphia) 來源限流不是這份文件的錯：往上拋，讓本輪停止碰這個來源
      if (error instanceof ObservatorySourceThrottledError) throw error;
      const next = nextStateAfterFailure(
        doc.attemptCount,
        now,
        OBSERVATORY_DOCUMENT_STATUS.FAILED,
      );
      await deps.documents.transition(doc.id, doc.status, {
        status: next.status,
        attemptCount: next.attemptCount,
        nextAttemptAt: next.nextAttemptAt,
        lastError: describeError(error),
      });
      deps.log(
        `download ${doc.source} ${doc.stockId}/${doc.year} failed (${next.attemptCount}): ${describeError(error)}`,
      );
      return next.status === OBSERVATORY_DOCUMENT_STATUS.DEAD
        ? OBSERVATORY_DOWNLOAD_RESULT.DEAD
        : OBSERVATORY_DOWNLOAD_RESULT.FAILED;
    }
  }

  return {
    downloadOne,

    async planDocuments(): Promise<{ created: number; refreshed: number }> {
      const now = deps.now();
      const companies = await deps.companies.listActive();
      const rows = buildPlanRows(companies, now);
      let created = 0;
      for (let i = 0; i < rows.length; i += OBSERVATORY_PLAN_CREATE_CHUNK) {
        created += await deps.documents.createPending(
          rows.slice(i, i + OBSERVATORY_PLAN_CREATE_CHUNK),
        );
      }
      let refreshed = 0;
      for (const source of OBSERVATORY_SOURCES) {
        const refreshAfter = OBSERVATORY_REFRESH_AFTER_MS[source];
        if (refreshAfter === null) continue;
        refreshed += await deps.documents.markStaleForRefresh({
          source,
          indexedBefore: new Date(now.getTime() - refreshAfter),
          now,
        });
      }
      deps.log(
        `planned ${companies.length} companies: ${created} new, ${refreshed} refresh`,
      );
      return { created, refreshed };
    },

    async processDownloads(): Promise<IObservatoryProcessSummary> {
      const summary: IObservatoryProcessSummary = {
        attempted: 0,
        downloaded: 0,
        unchanged: 0,
        notAvailable: 0,
        failed: 0,
        dead: 0,
        throttledSources: [],
      };
      for (const source of OBSERVATORY_SOURCES) {
        if (deps.shouldStop()) break;
        const now = deps.now();
        const docs = await deps.documents.findDueForDownload({
          source,
          now,
          minYear: minTrackedYear(now),
          take: OBSERVATORY_DOWNLOAD_BATCH_PER_SOURCE,
        });
        if (docs.length === 0) continue;
        const companies = await deps.companies.findByStockIds(
          Array.from(new Set(docs.map((doc) => doc.stockId))),
        );
        const byStockId = new Map(companies.map((c) => [c.stockId, c]));

        for (const doc of docs) {
          if (deps.shouldStop()) break;
          summary.attempted += 1;
          try {
            const result = await downloadOne(doc, byStockId.get(doc.stockId));
            if (result === OBSERVATORY_DOWNLOAD_RESULT.DOWNLOADED)
              summary.downloaded += 1;
            if (result === OBSERVATORY_DOWNLOAD_RESULT.UNCHANGED)
              summary.unchanged += 1;
            if (result === OBSERVATORY_DOWNLOAD_RESULT.NOT_AVAILABLE)
              summary.notAvailable += 1;
            if (result === OBSERVATORY_DOWNLOAD_RESULT.FAILED)
              summary.failed += 1;
            if (result === OBSERVATORY_DOWNLOAD_RESULT.DEAD) summary.dead += 1;
          } catch (error) {
            if (error instanceof ObservatorySourceThrottledError) {
              deps.log(`${source} throttled; backing off until next round`);
              summary.throttledSources.push(source);
              break;
            }
            throw error;
          }
        }
      }
      return summary;
    },
  };
}

export type ICompanyObservatoryService = ReturnType<
  typeof createCompanyObservatoryService
>;
