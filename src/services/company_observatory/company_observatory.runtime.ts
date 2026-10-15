import {
  OBSERVATORY_CONTENT_TYPE,
  ObservatoryDocumentStatus,
} from "@/constants/company_observatory";
import {
  IObservatoryDocumentView,
  IObservatoryListQuery,
  IObservatoryOverview,
  IObservatorySearchHit,
  IObservatoryVectorFilter,
} from "@/interfaces/company_observatory";
import { ObservatoryDocument } from "@/generated";
import { companyRepo } from "@/repositories/company.repo";
import { observatoryDocumentRepo } from "@/repositories/observatory_document.repo";
import { observatoryVectorRepo } from "@/repositories/observatory_vector.repo";
import { createObservatoryHttpClient } from "@/lib/company_observatory/http_client";
import { createOllamaEmbedder } from "@/lib/company_observatory/embedder";
import { createFileStorage } from "@/lib/company_observatory/storage";
import { normalizeExtractedText } from "@/lib/company_observatory/chunking";
import { extractPdfTextLayer, splitTextByPages } from "@/lib/pdf_text_layer";
import { logger } from "@/lib/utils/logger";
import { IObservatoryRequeueInput } from "@/validators/company_observatory";
import { OBSERVATORY_DOWNLOADERS } from "@/services/company_observatory/downloader.registry";
import {
  createCompanyObservatoryService,
  IObservatoryCompany,
  IObservatoryCompanyDirectory,
} from "@/services/company_observatory/company_observatory.service";
import {
  createCompanyObservatoryIndexer,
  IObservatoryPageExtractor,
} from "@/services/company_observatory/company_observatory.indexer.service";

/**
 * Info: (20261015 - Luphia) 企業觀測站的正式組裝：把 Prisma／LanceDB／Ollama／檔案系統接上
 * 純邏輯的 service。worker（cron）與管理端 API 都從這裡取用。
 */

const COMPANY_SELECT = {
  stockId: true,
  name: true,
  abbreviation: true,
  marketType: true,
  taxId: true,
} as const;

// Info: (20261015 - Luphia) Company 是唯讀字典：這裡只讀，觀測站不回寫任何欄位（CLAUDE.md §9）
export const companyDirectory: IObservatoryCompanyDirectory = {
  async listActive(): Promise<IObservatoryCompany[]> {
    return companyRepo.findMany({
      where: { isActive: true },
      select: COMPANY_SELECT,
      orderBy: { stockId: "asc" },
    });
  },
  async findByStockIds(stockIds: string[]): Promise<IObservatoryCompany[]> {
    if (stockIds.length === 0) return [];
    return companyRepo.findMany({
      where: { stockId: { in: stockIds } },
      select: COMPANY_SELECT,
    });
  },
};

// Info: (20261015 - Luphia) PDF 走既有的文字層抽取（pdf-parse），文字型來源整份視為一頁
export const extractObservatoryPages: IObservatoryPageExtractor = async (
  body,
  contentType,
) => {
  if (contentType === OBSERVATORY_CONTENT_TYPE.TEXT) {
    return [body.toString("utf-8")];
  }
  const layer = await extractPdfTextLayer(body);
  if (!layer) return null;
  return splitTextByPages(layer.text)
    .map(normalizeExtractedText)
    .filter((page) => page.trim().length > 0);
};

const log = (message: string) => logger.info(`[CompanyObservatory] ${message}`);
const storage = createFileStorage();
const embedder = createOllamaEmbedder();

export function buildCompanyObservatoryService(shouldStop: () => boolean) {
  return createCompanyObservatoryService({
    documents: observatoryDocumentRepo,
    companies: companyDirectory,
    downloaders: OBSERVATORY_DOWNLOADERS,
    http: createObservatoryHttpClient(),
    storage,
    now: () => new Date(),
    shouldStop,
    log,
  });
}

export function buildCompanyObservatoryIndexer(shouldStop: () => boolean) {
  return createCompanyObservatoryIndexer({
    documents: observatoryDocumentRepo,
    companies: companyDirectory,
    vectors: observatoryVectorRepo,
    embedder,
    storage,
    extractPages: extractObservatoryPages,
    now: () => new Date(),
    shouldStop,
    log,
  });
}

// ---------------------------------------------------------------------------
// Info: (20261015 - Luphia) 管理端查詢
// ---------------------------------------------------------------------------

export function toDocumentView(
  row: ObservatoryDocument,
): IObservatoryDocumentView {
  return {
    id: row.id,
    stockId: row.stockId,
    source: row.source,
    year: row.year,
    status: row.status,
    title: row.title,
    sourceUrl: row.sourceUrl,
    chunkCount: row.chunkCount,
    attemptCount: row.attemptCount,
    lastError: row.lastError,
    nextAttemptAt: row.nextAttemptAt.toISOString(),
    downloadedAt: row.downloadedAt?.toISOString() ?? null,
    indexedAt: row.indexedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getObservatoryOverview(
  query: IObservatoryListQuery,
): Promise<IObservatoryOverview> {
  const [counts, { rows, total }] = await Promise.all([
    observatoryDocumentRepo.countBySourceStatus(),
    observatoryDocumentRepo.list(query),
  ]);
  return {
    counts,
    documents: rows.map(toDocumentView),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function requeueObservatoryDocuments(
  input: IObservatoryRequeueInput,
): Promise<{ requeued: number }> {
  const now = new Date();
  const requeued =
    "ids" in input
      ? await observatoryDocumentRepo.requeueDead({ ids: input.ids, now })
      : await observatoryDocumentRepo.requeueDead({
          source: input.source,
          now,
        });
  return { requeued };
}

export async function searchObservatory(params: {
  query: string;
  filter: IObservatoryVectorFilter;
  limit: number;
}): Promise<IObservatorySearchHit[]> {
  return buildCompanyObservatoryIndexer(() => false).search(params);
}

export function countObservatoryDocuments(
  status: ObservatoryDocumentStatus,
): Promise<number> {
  return observatoryDocumentRepo.countByStatus(status);
}
