import {
  OBSERVATORY_CONTENT_TYPE,
  OBSERVATORY_DOCUMENT_STATUS,
  OBSERVATORY_FETCH_OUTCOME,
  OBSERVATORY_MAX_ATTEMPTS,
  OBSERVATORY_REASON,
  OBSERVATORY_SOURCE,
  OBSERVATORY_SOURCES,
  ObservatorySource,
} from "@/constants/company_observatory";
import {
  IObservatoryDownloader,
  IObservatoryFetchResult,
  IObservatoryVectorRow,
} from "@/interfaces/company_observatory";
import {
  ObservatoryInfraUnavailableError,
  ObservatorySourceThrottledError,
} from "@/lib/company_observatory/errors";
import type { IObservatoryPlanRow } from "@/repositories/observatory_document.repo";
import type {
  IObservatoryCompany,
  IObservatoryDocumentStore,
} from "@/services/company_observatory/company_observatory.service";
import type { IObservatoryVectorStore } from "@/services/company_observatory/company_observatory.indexer.service";
import type { IObservatoryReportRecord } from "@/lib/company_observatory/report_projection";

// Info: (20261015 - Luphia) 這支測試只用記憶體假物件：不載入 Prisma 與 LanceDB 原生模組
jest.mock("@/lib/prisma", () => ({ prisma: {} }));
jest.mock("@/services/lancedb.service", () => ({ lanceDBService: {} }));

/**
 * Info: (20261015 - Luphia) 企業觀測站「規劃 → 下載 → 索引」狀態流與冪等性。
 */

interface IFakeDoc {
  id: string;
  stockId: string;
  source: string;
  year: number;
  status: string;
  title: string | null;
  sourceUrl: string | null;
  filePath: string | null;
  contentType: string | null;
  contentHash: string | null;
  indexedHash: string | null;
  chunkCount: number;
  attemptCount: number;
  lastError: string | null;
  nextAttemptAt: Date;
  downloadedAt: Date | null;
  indexedAt: Date | null;
}

type IFakeUpdate = Record<string, unknown>;

// Info: (20261015 - Luphia) 與 observatoryDocumentRepo 同語意的記憶體實作（唯一鍵、條件更新）
function createMemoryDocuments() {
  const docs = new Map<string, IFakeDoc>();
  let seq = 0;
  const store = {
    docs,
    async createPending(rows: IObservatoryPlanRow[]) {
      let created = 0;
      for (const row of rows) {
        const exists = Array.from(docs.values()).some(
          (doc) =>
            doc.stockId === row.stockId &&
            doc.source === row.source &&
            doc.year === row.year,
        );
        if (exists) continue;
        seq += 1;
        const id = `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`;
        docs.set(id, {
          id,
          ...row,
          status: OBSERVATORY_DOCUMENT_STATUS.PENDING,
          title: null,
          sourceUrl: null,
          filePath: null,
          contentType: null,
          contentHash: null,
          indexedHash: null,
          chunkCount: 0,
          attemptCount: 0,
          lastError: null,
          // Info: (20261023 - Luphia) 與正式 repo 相同：規劃時給了首次查詢時間就照用
          nextAttemptAt: row.nextAttemptAt ?? new Date(0),
          downloadedAt: null,
          indexedAt: null,
        });
        created += 1;
      }
      return created;
    },
    async findDueForDownload(params: {
      source: ObservatorySource;
      now: Date;
      minYear: number;
      take: number;
    }) {
      return Array.from(docs.values())
        .filter(
          (doc) =>
            doc.source === params.source &&
            doc.nextAttemptAt <= params.now &&
            (doc.status === OBSERVATORY_DOCUMENT_STATUS.PENDING ||
              doc.status === OBSERVATORY_DOCUMENT_STATUS.FAILED ||
              (doc.status === OBSERVATORY_DOCUMENT_STATUS.NOT_AVAILABLE &&
                doc.year >= params.minYear)),
        )
        .slice(0, params.take)
        .map((doc) => ({ ...doc }));
    },
    async findDueForIndex(params: { now: Date; take: number }) {
      return Array.from(docs.values())
        .filter(
          (doc) =>
            doc.status === OBSERVATORY_DOCUMENT_STATUS.DOWNLOADED &&
            doc.nextAttemptAt <= params.now,
        )
        .slice(0, params.take)
        .map((doc) => ({ ...doc }));
    },
    async transition(id: string, fromStatus: string, data: IFakeUpdate) {
      const doc = docs.get(id);
      if (!doc || doc.status !== fromStatus) return false;
      Object.assign(doc, data);
      return true;
    },
    async markStaleForRefresh(params: {
      source: ObservatorySource;
      indexedBefore: Date;
      now: Date;
    }) {
      let count = 0;
      for (const doc of docs.values()) {
        if (
          doc.source === params.source &&
          doc.status === OBSERVATORY_DOCUMENT_STATUS.INDEXED &&
          doc.indexedAt !== null &&
          doc.indexedAt < params.indexedBefore
        ) {
          doc.status = OBSERVATORY_DOCUMENT_STATUS.PENDING;
          doc.nextAttemptAt = params.now;
          count += 1;
        }
      }
      return count;
    },
  };
  return store;
}

const COMPANY: IObservatoryCompany = {
  stockId: "2330",
  name: "台灣積體電路製造股份有限公司",
  abbreviation: "台積電",
  marketType: "sii",
  taxId: "22099131",
  industry: "24",
  metadata: { 實收資本額: "259323700670" },
};

function scriptedDownloader(
  source: ObservatorySource,
  respond: () => Promise<IObservatoryFetchResult>,
): IObservatoryDownloader & { calls: number } {
  const downloader = {
    source,
    calls: 0,
    async fetch() {
      downloader.calls += 1;
      return respond();
    },
  };
  return downloader;
}

const textFound = (text: string): IObservatoryFetchResult => ({
  outcome: OBSERVATORY_FETCH_OUTCOME.FOUND,
  sourceUrl: "https://example.test/doc",
  title: "doc",
  contentType: OBSERVATORY_CONTENT_TYPE.TEXT,
  body: Buffer.from(text, "utf-8"),
  metadata: { period: "2024/01/01~2024/12/31", assuranceAgency: "DNV" },
});

const notAvailable: IObservatoryFetchResult = {
  outcome: OBSERVATORY_FETCH_OUTCOME.NOT_AVAILABLE,
  reason: OBSERVATORY_REASON.NO_FILE,
  sourceUrl: null,
};

async function setup(
  overrides: Partial<
    Record<ObservatorySource, () => Promise<IObservatoryFetchResult>>
  > = {},
) {
  const { createCompanyObservatoryService } =
    await import("@/services/company_observatory/company_observatory.service");
  const { createCompanyObservatoryIndexer } =
    await import("@/services/company_observatory/company_observatory.indexer.service");
  let clock = new Date("2026-10-15T00:00:00Z");
  const documents = createMemoryDocuments();
  const files = new Map<string, Buffer>();
  const saves: string[] = [];
  const storage = {
    async save(relativePath: string, body: Buffer) {
      saves.push(relativePath);
      files.set(relativePath, body);
    },
    async read(relativePath: string) {
      const body = files.get(relativePath);
      if (!body) throw new Error("missing file");
      return body;
    },
  };
  const downloaders = Object.fromEntries(
    OBSERVATORY_SOURCES.map((source) => [
      source,
      scriptedDownloader(
        source,
        overrides[source] ?? (async () => textFound(`${source} 內容`)),
      ),
    ]),
  ) as Record<ObservatorySource, IObservatoryDownloader & { calls: number }>;
  const vectorRows = new Map<string, IObservatoryVectorRow[]>();
  const vectorWrites: string[] = [];
  const vectors: IObservatoryVectorStore = {
    async replaceDocumentChunks(documentId, rows) {
      vectorWrites.push(documentId);
      vectorRows.set(documentId, rows);
    },
    async search() {
      return [];
    },
    async searchText() {
      return [];
    },
    async optimize() {
      return undefined;
    },
  };
  const embedder = { embed: jest.fn(async () => [0.1, 0.2]) };
  const published = new Map<string, IObservatoryReportRecord>();
  const reports = {
    async publish(record: IObservatoryReportRecord) {
      published.set(record.pdfPath, record);
    },
  };
  const companies = {
    listActive: async () => [COMPANY],
    findByStockIds: async (ids: string[]) =>
      ids.includes(COMPANY.stockId) ? [COMPANY] : [],
  };
  const common = {
    companies,
    storage,
    now: () => clock,
    shouldStop: () => false,
    log: () => undefined,
  };
  const service = createCompanyObservatoryService({
    ...common,
    documents: documents as unknown as IObservatoryDocumentStore,
    downloaders,
    http: { request: async () => ({ status: 500, body: Buffer.alloc(0) }) },
  });
  const indexer = createCompanyObservatoryIndexer({
    ...common,
    documents: documents as unknown as Parameters<
      typeof createCompanyObservatoryIndexer
    >[0]["documents"],
    vectors,
    reports,
    embedder,
    extractPages: async (body: Buffer) => [body.toString("utf-8")],
  });
  return {
    service,
    indexer,
    documents,
    downloaders,
    saves,
    vectorRows,
    vectorWrites,
    embedder,
    published,
    advance(ms: number) {
      clock = new Date(clock.getTime() + ms);
    },
    docOf(source: ObservatorySource) {
      return Array.from(documents.docs.values()).filter(
        (d) => d.source === source,
      );
    },
  };
}

const DAY = 24 * 60 * 60 * 1000;

describe("company observatory pipeline", () => {
  it("plans each source × year once, even when re-run", async () => {
    const t = await setup();
    const first = await t.service.planDocuments();
    // Info: (20261015 - Luphia) 公司登記 1 年 + 三個年度來源各 2 年
    // Info: (20261023 - Luphia) + 第一～三季財報各 1 年（只追蹤今年）= 10
    expect(first.created).toBe(10);
    const second = await t.service.planDocuments();
    expect(second.created).toBe(0);
    expect(t.documents.docs.size).toBe(10);
  });

  it("downloads, indexes with metadata, and does not repeat either step", async () => {
    const t = await setup();
    await t.service.planDocuments();
    const downloads = await t.service.processDownloads();
    expect(downloads.downloaded).toBe(10);
    expect(t.saves).toHaveLength(10);

    await t.indexer.indexBatch();
    await t.indexer.indexBatch();
    const indexed = Array.from(t.documents.docs.values());
    expect(
      indexed.every((d) => d.status === OBSERVATORY_DOCUMENT_STATUS.INDEXED),
    ).toBe(true);
    expect(indexed.every((d) => d.indexedHash === d.contentHash)).toBe(true);

    const esg = t.docOf(OBSERVATORY_SOURCE.ESG_REPORT)[0];
    const rows = t.vectorRows.get(esg.id) ?? [];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: `${esg.id}_0`,
      document_id: esg.id,
      stock_id: "2330",
      company_name: "台積電",
      source: OBSERVATORY_SOURCE.ESG_REPORT,
      year: esg.year,
      source_url: "https://example.test/doc",
      page_number: 1,
    });
    expect(rows[0].text).toContain(`台積電 (2330) ｜ ${esg.year} 年永續報告書`);

    // Info: (20261015 - Luphia) 每份索引完成的文件都發布成企業觀測站頁面的 Report
    expect(t.published.size).toBe(10);
    expect(t.published.get(`observatory/2330/${esg.year}/ESG_REPORT`)).toEqual({
      companyName: "台灣積體電路製造股份有限公司",
      title: `${esg.year} 年永續報告書`,
      reportYear: String(esg.year),
      period: "2024/01/01~2024/12/31",
      industry: "半導體業",
      capital: "100億以上",
      verificationAgency: "",
      verificationStandards: "",
      assuranceAgency: "DNV",
      assuranceStandards: "",
      isVerifiedByThirdParty: true,
      pdfPath: `observatory/2330/${esg.year}/ESG_REPORT`,
    });

    // Info: (20261015 - Luphia) 再跑一輪：沒有到期的文件，什麼都不做
    const again = await t.service.processDownloads();
    expect(again.attempted).toBe(0);
    expect(t.vectorWrites).toHaveLength(10);
  });

  it("refreshes registration data but skips re-indexing when the content is unchanged", async () => {
    const t = await setup();
    await t.service.planDocuments();
    await t.service.processDownloads();
    await t.indexer.indexBatch();
    await t.indexer.indexBatch();
    const writesBefore = t.vectorWrites.length;

    t.advance(31 * DAY);
    const plan = await t.service.planDocuments();
    expect(plan.refreshed).toBe(1);
    const downloads = await t.service.processDownloads();
    expect(downloads.unchanged).toBe(1);
    expect(t.saves).toHaveLength(10);
    await t.indexer.indexBatch();
    expect(t.vectorWrites).toHaveLength(writesBefore);
    expect(t.docOf(OBSERVATORY_SOURCE.GCIS_REGISTRATION)[0].status).toBe(
      OBSERVATORY_DOCUMENT_STATUS.INDEXED,
    );
  });

  it("re-indexes and overwrites the chunks when refreshed content changed", async () => {
    let version = "v1";
    const t = await setup({
      [OBSERVATORY_SOURCE.GCIS_REGISTRATION]: async () =>
        textFound(`董事 ${version}`),
    });
    await t.service.planDocuments();
    await t.service.processDownloads();
    await t.indexer.indexBatch();
    await t.indexer.indexBatch();
    const gcis = t.docOf(OBSERVATORY_SOURCE.GCIS_REGISTRATION)[0];
    const firstHash = gcis.indexedHash;

    version = "v2";
    t.advance(31 * DAY);
    await t.service.planDocuments();
    await t.service.processDownloads();
    await t.indexer.indexBatch();
    expect(gcis.status).toBe(OBSERVATORY_DOCUMENT_STATUS.INDEXED);
    expect(gcis.indexedHash).not.toBe(firstHash);
    expect(t.vectorRows.get(gcis.id)?.[0].text).toContain("董事 v2");
  });

  it("records NOT_AVAILABLE without counting a failure and re-checks later", async () => {
    const t = await setup({
      [OBSERVATORY_SOURCE.ESG_REPORT]: async () => notAvailable,
    });
    await t.service.planDocuments();
    await t.service.processDownloads();
    const esg = t.docOf(OBSERVATORY_SOURCE.ESG_REPORT);
    expect(
      esg.every((d) => d.status === OBSERVATORY_DOCUMENT_STATUS.NOT_AVAILABLE),
    ).toBe(true);
    expect(esg.every((d) => d.attemptCount === 0)).toBe(true);

    const calls = t.downloaders.ESG_REPORT.calls;
    await t.service.processDownloads();
    expect(t.downloaders.ESG_REPORT.calls).toBe(calls);
    /**
     * Info: (20261023 - Luphia) 申報季感知排程：2026-10-15 時 2024、2025 年度永續報告書的申報季（次年 8/31 + 14 天）
     * 都已過，改為每 30 天重查；8 天後不查，31 天後才查。
     */
    t.advance(8 * DAY);
    await t.service.processDownloads();
    expect(t.downloaders.ESG_REPORT.calls).toBe(calls);
    t.advance(23 * DAY);
    await t.service.processDownloads();
    expect(t.downloaders.ESG_REPORT.calls).toBe(calls + 2);
  });

  it("moves a document to the dead letter after the retry limit", async () => {
    const t = await setup({
      [OBSERVATORY_SOURCE.GHG_INVENTORY]: async () => {
        throw new Error("HTTP 500");
      },
    });
    await t.service.planDocuments();
    for (let i = 0; i < OBSERVATORY_MAX_ATTEMPTS + 2; i += 1) {
      await t.service.processDownloads();
      t.advance(DAY);
    }
    const ghg = t.docOf(OBSERVATORY_SOURCE.GHG_INVENTORY);
    expect(
      ghg.every((d) => d.status === OBSERVATORY_DOCUMENT_STATUS.DEAD),
    ).toBe(true);
    expect(ghg.every((d) => d.attemptCount === OBSERVATORY_MAX_ATTEMPTS)).toBe(
      true,
    );
    expect(ghg[0].lastError).toContain("HTTP 500");
    // Info: (20261015 - Luphia) 死信不再自動重試
    expect(t.downloaders.GHG_INVENTORY.calls).toBe(
      OBSERVATORY_MAX_ATTEMPTS * 2,
    );
  });

  it("stops a throttled source for the round without counting failures", async () => {
    const t = await setup({
      [OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT]: async () => {
        throw new ObservatorySourceThrottledError(
          OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT,
          "too many",
        );
      },
    });
    await t.service.planDocuments();
    const summary = await t.service.processDownloads();
    expect(summary.throttledSources).toEqual([
      OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT,
    ]);
    expect(t.downloaders.MOPS_FINANCIAL_REPORT.calls).toBe(1);
    const mops = t.docOf(OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT);
    expect(
      mops.every((d) => d.status === OBSERVATORY_DOCUMENT_STATUS.PENDING),
    ).toBe(true);
    expect(mops.every((d) => d.attemptCount === 0)).toBe(true);
    // Info: (20261015 - Luphia) 其他來源照常
    // Info: (20261023 - Luphia) 限流以主機為單位：第一～三季與年報同一台 MOPS 主機，這一輪一起跳過
    expect(summary.downloaded).toBe(5);
    expect(t.downloaders.MOPS_FINANCIAL_REPORT_Q1.calls).toBe(0);
  });

  it("pauses indexing when the embedder is down, without burning attempts", async () => {
    const t = await setup();
    await t.service.planDocuments();
    await t.service.processDownloads();
    t.embedder.embed.mockRejectedValue(
      new ObservatoryInfraUnavailableError("ollama down"),
    );
    const summary = await t.indexer.indexBatch();
    expect(summary.skippedReason).toContain("ollama down");
    expect(summary.attempted).toBe(0);
    const docs = Array.from(t.documents.docs.values());
    expect(
      docs.every((d) => d.status === OBSERVATORY_DOCUMENT_STATUS.DOWNLOADED),
    ).toBe(true);
    expect(docs.every((d) => d.attemptCount === 0)).toBe(true);
  });

  it("sends a document without any text straight to the dead letter", async () => {
    const t = await setup({
      [OBSERVATORY_SOURCE.ESG_REPORT]: async () => textFound("   "),
    });
    await t.service.planDocuments();
    await t.service.processDownloads();
    await t.indexer.indexBatch();
    await t.indexer.indexBatch();
    const esg = t.docOf(OBSERVATORY_SOURCE.ESG_REPORT);
    expect(
      esg.every((d) => d.status === OBSERVATORY_DOCUMENT_STATUS.DEAD),
    ).toBe(true);
    expect(esg[0].lastError).toBe(OBSERVATORY_REASON.NO_TEXT_LAYER);
    expect(
      Array.from(t.published.keys()).some((key) => key.includes("ESG_REPORT")),
    ).toBe(false);
  });
});
