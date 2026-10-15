import {
  OBSERVATORY_DOCUMENT_STATUS,
  OBSERVATORY_EMBED_CONCURRENCY,
  OBSERVATORY_INDEX_BATCH,
  OBSERVATORY_REASON,
  OBSERVATORY_SOURCES,
  ObservatorySource,
} from "@/constants/company_observatory";
import {
  IObservatoryEmbedder,
  IObservatoryIndexSummary,
  IObservatorySearchHit,
  IObservatoryVectorFilter,
  IObservatoryVectorRow,
} from "@/interfaces/company_observatory";
import { observatoryDocumentRepo } from "@/repositories/observatory_document.repo";
import { observatoryVectorRepo } from "@/repositories/observatory_vector.repo";
import { chunkHeader, chunkPages } from "@/lib/company_observatory/chunking";
import { ObservatoryInfraUnavailableError } from "@/lib/company_observatory/errors";
import { nextStateAfterFailure } from "@/lib/company_observatory/retry_policy";
import { IObservatoryStorage } from "@/lib/company_observatory/storage";
import { IObservatoryCompanyDirectory } from "@/services/company_observatory/company_observatory.service";
import { runWithConcurrency } from "@/lib/utils/concurrency";
import { describeError } from "@/lib/utils/error_message";

/**
 * Info: (20261015 - Luphia) 企業觀測站：索引與檢索。
 *
 * DOWNLOADED 的文件讀回本機檔 → 抽文字（PDF 走既有的文字層抽取，不送 OCR／LLM）→ 逐頁切塊 →
 * 本機 Ollama 產生向量 → 以文件為單位覆寫進 LanceDB。每個切塊帶公司代號、報告類型、年度、
 * 來源 URL、頁碼等欄位，檢索時可依公司與類型過濾。
 *
 * 這條路徑沒有任何 LLM 生成：文字照原文切、數值照原文存，不做萃取以外的事（CLAUDE.md §8）。
 */

export type IObservatoryIndexStore = Pick<
  typeof observatoryDocumentRepo,
  "findDueForIndex" | "transition"
>;

export type IObservatoryVectorStore = Pick<
  typeof observatoryVectorRepo,
  "replaceDocumentChunks" | "search"
>;

// Info: (20261015 - Luphia) 依內容型別把檔案轉成逐頁文字；回傳 null 代表抽取失敗（可重試）
export type IObservatoryPageExtractor = (
  body: Buffer,
  contentType: string,
) => Promise<string[] | null>;

export interface ICompanyObservatoryIndexerDeps {
  documents: IObservatoryIndexStore;
  companies: IObservatoryCompanyDirectory;
  vectors: IObservatoryVectorStore;
  embedder: IObservatoryEmbedder;
  storage: IObservatoryStorage;
  extractPages: IObservatoryPageExtractor;
  now: () => Date;
  shouldStop: () => boolean;
  log: (message: string) => void;
}

export interface IObservatoryIndexDocument {
  id: string;
  stockId: string;
  source: string;
  year: number;
  status: string;
  attemptCount: number;
  filePath: string | null;
  contentType: string | null;
  contentHash: string | null;
  sourceUrl: string | null;
}

export const OBSERVATORY_INDEX_RESULT = {
  INDEXED: "INDEXED",
  FAILED: "FAILED",
  DEAD: "DEAD",
} as const;

export type ObservatoryIndexResult =
  (typeof OBSERVATORY_INDEX_RESULT)[keyof typeof OBSERVATORY_INDEX_RESULT];

function isObservatorySource(value: string): value is ObservatorySource {
  return (OBSERVATORY_SOURCES as readonly string[]).includes(value);
}

export function toSearchHit(
  row: IObservatoryVectorRow & { _distance?: number },
): IObservatorySearchHit {
  return {
    documentId: row.document_id,
    stockId: row.stock_id,
    companyName: row.company_name,
    source: row.source,
    year: Number(row.year),
    sourceUrl: row.source_url,
    pageNumber: Number(row.page_number),
    chunkIndex: Number(row.chunk_index),
    text: row.text,
    distance: typeof row._distance === "number" ? row._distance : null,
  };
}

export function createCompanyObservatoryIndexer(
  deps: ICompanyObservatoryIndexerDeps,
) {
  // Info: (20261015 - Luphia) 永久性錯誤（例如掃描檔沒有文字層）：重試也不會變好，直接進死信
  async function markDead(doc: IObservatoryIndexDocument, reason: string) {
    await deps.documents.transition(doc.id, doc.status, {
      status: OBSERVATORY_DOCUMENT_STATUS.DEAD,
      lastError: reason,
      attemptCount: doc.attemptCount + 1,
    });
  }

  async function indexOne(
    doc: IObservatoryIndexDocument,
    companyName: string,
  ): Promise<ObservatoryIndexResult> {
    try {
      if (!isObservatorySource(doc.source)) {
        throw new Error(`unknown source ${doc.source}`);
      }
      if (!doc.filePath || !doc.contentType || !doc.contentHash) {
        throw new Error("downloaded document has no file metadata");
      }
      const source = doc.source;
      const body = await deps.storage.read(doc.filePath);
      const pages = await deps.extractPages(body, doc.contentType);
      if (pages === null) throw new Error("text extraction failed");

      const chunks = chunkPages(pages);
      if (chunks.length === 0) {
        await markDead(doc, OBSERVATORY_REASON.NO_TEXT_LAYER);
        return OBSERVATORY_INDEX_RESULT.DEAD;
      }

      const contentHash = doc.contentHash;
      const rows = await runWithConcurrency(
        chunks.map((chunk) => async (): Promise<IObservatoryVectorRow> => {
          const text = `${chunkHeader({
            companyName,
            stockId: doc.stockId,
            source,
            year: doc.year,
            pageNumber: chunk.pageNumber,
          })}\n${chunk.text}`;
          return {
            id: `${doc.id}_${chunk.chunkIndex}`,
            vector: await deps.embedder.embed(text),
            text,
            document_id: doc.id,
            stock_id: doc.stockId,
            company_name: companyName,
            source,
            year: doc.year,
            source_url: doc.sourceUrl ?? "",
            page_number: chunk.pageNumber,
            chunk_index: chunk.chunkIndex,
            content_hash: contentHash,
          };
        }),
        OBSERVATORY_EMBED_CONCURRENCY,
      );

      await deps.vectors.replaceDocumentChunks(doc.id, rows);
      const now = deps.now();
      await deps.documents.transition(doc.id, doc.status, {
        status: OBSERVATORY_DOCUMENT_STATUS.INDEXED,
        indexedHash: contentHash,
        chunkCount: rows.length,
        indexedAt: now,
        attemptCount: 0,
        lastError: null,
        nextAttemptAt: now,
      });
      return OBSERVATORY_INDEX_RESULT.INDEXED;
    } catch (error) {
      // Info: (20261015 - Luphia) 向量服務或資料表不可用：不計這份文件的失敗次數
      if (error instanceof ObservatoryInfraUnavailableError) throw error;
      const next = nextStateAfterFailure(
        doc.attemptCount,
        deps.now(),
        OBSERVATORY_DOCUMENT_STATUS.DOWNLOADED,
      );
      await deps.documents.transition(doc.id, doc.status, {
        status: next.status,
        attemptCount: next.attemptCount,
        nextAttemptAt: next.nextAttemptAt,
        lastError: describeError(error),
      });
      deps.log(
        `index ${doc.source} ${doc.stockId}/${doc.year} failed (${next.attemptCount}): ${describeError(error)}`,
      );
      return next.status === OBSERVATORY_DOCUMENT_STATUS.DEAD
        ? OBSERVATORY_INDEX_RESULT.DEAD
        : OBSERVATORY_INDEX_RESULT.FAILED;
    }
  }

  return {
    indexOne,

    async indexBatch(): Promise<IObservatoryIndexSummary> {
      const summary: IObservatoryIndexSummary = {
        attempted: 0,
        indexed: 0,
        failed: 0,
        dead: 0,
        skippedReason: null,
      };
      const docs = await deps.documents.findDueForIndex({
        now: deps.now(),
        take: OBSERVATORY_INDEX_BATCH,
      });
      if (docs.length === 0) return summary;
      const companies = await deps.companies.findByStockIds(
        Array.from(new Set(docs.map((doc) => doc.stockId))),
      );
      const names = new Map(
        companies.map((c) => [c.stockId, c.abbreviation || c.name]),
      );

      for (const doc of docs) {
        if (deps.shouldStop()) break;
        summary.attempted += 1;
        try {
          const result = await indexOne(
            doc,
            names.get(doc.stockId) ?? doc.stockId,
          );
          if (result === OBSERVATORY_INDEX_RESULT.INDEXED) summary.indexed += 1;
          if (result === OBSERVATORY_INDEX_RESULT.FAILED) summary.failed += 1;
          if (result === OBSERVATORY_INDEX_RESULT.DEAD) summary.dead += 1;
        } catch (error) {
          if (error instanceof ObservatoryInfraUnavailableError) {
            summary.attempted -= 1;
            summary.skippedReason = error.message;
            deps.log(`indexing paused: ${error.message}`);
            break;
          }
          throw error;
        }
      }
      return summary;
    },

    async search(params: {
      query: string;
      filter: IObservatoryVectorFilter;
      limit: number;
    }): Promise<IObservatorySearchHit[]> {
      const vector = await deps.embedder.embed(params.query);
      const rows = await deps.vectors.search({
        vector,
        filter: params.filter,
        limit: params.limit,
      });
      return rows.map(toSearchHit);
    },
  };
}

export type ICompanyObservatoryIndexer = ReturnType<
  typeof createCompanyObservatoryIndexer
>;
