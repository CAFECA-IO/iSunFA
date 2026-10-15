import {
  OBSERVATORY_CHUNK_OVERLAP,
  OBSERVATORY_CHUNK_SIZE,
  OBSERVATORY_DOCUMENT_STATUS,
  OBSERVATORY_MAX_ATTEMPTS,
  OBSERVATORY_RETRY_BASE_DELAY_MS,
  OBSERVATORY_SOURCE,
} from "@/constants/company_observatory";
import {
  minTrackedYear,
  nextStateAfterFailure,
  targetYearsFor,
} from "@/lib/company_observatory/retry_policy";
import {
  chunkPages,
  chunkText,
  normalizeExtractedText,
} from "@/lib/company_observatory/chunking";
import { createHostRateLimiter } from "@/lib/company_observatory/host_rate_limiter";
import { observatoryStockIdSchema } from "@/validators/company_observatory";

jest.mock("@/services/lancedb.service", () => ({ lanceDBService: {} }));

// Info: (20261015 - Luphia) 動態載入，確保上面的 mock 先生效（不載入原生 LanceDB 模組）
const loadWhereBuilder = async () =>
  (await import("@/repositories/observatory_vector.repo"))
    .buildObservatoryWhere;

describe("company observatory retry policy", () => {
  const now = new Date("2026-10-15T00:00:00Z");

  it("backs off and gives up after the maximum attempts", () => {
    const first = nextStateAfterFailure(
      0,
      now,
      OBSERVATORY_DOCUMENT_STATUS.FAILED,
    );
    expect(first.status).toBe(OBSERVATORY_DOCUMENT_STATUS.FAILED);
    expect(first.attemptCount).toBe(1);
    expect(first.nextAttemptAt.getTime() - now.getTime()).toBe(
      OBSERVATORY_RETRY_BASE_DELAY_MS,
    );

    const second = nextStateAfterFailure(
      1,
      now,
      OBSERVATORY_DOCUMENT_STATUS.FAILED,
    );
    expect(second.nextAttemptAt.getTime()).toBeGreaterThan(
      first.nextAttemptAt.getTime(),
    );

    const last = nextStateAfterFailure(
      OBSERVATORY_MAX_ATTEMPTS - 1,
      now,
      OBSERVATORY_DOCUMENT_STATUS.FAILED,
    );
    expect(last.status).toBe(OBSERVATORY_DOCUMENT_STATUS.DEAD);
    expect(last.attemptCount).toBe(OBSERVATORY_MAX_ATTEMPTS);
  });

  it("keeps indexing retries in DOWNLOADED so the file is not fetched again", () => {
    expect(
      nextStateAfterFailure(0, now, OBSERVATORY_DOCUMENT_STATUS.DOWNLOADED)
        .status,
    ).toBe(OBSERVATORY_DOCUMENT_STATUS.DOWNLOADED);
  });

  it("tracks a current-year snapshot for registration and past years for reports", () => {
    expect(targetYearsFor(OBSERVATORY_SOURCE.GCIS_REGISTRATION, now)).toEqual([
      2026,
    ]);
    expect(targetYearsFor(OBSERVATORY_SOURCE.ESG_REPORT, now)).toEqual([
      2025, 2024,
    ]);
    expect(minTrackedYear(now)).toBe(2024);
  });
});

describe("company observatory chunking", () => {
  it("joins CJK characters split by the PDF text layer but keeps tabs and newlines", () => {
    expect(normalizeExtractedText("本 合 併 財 務 報 告\n係 包 含")).toBe(
      "本合併財務報告\n係包含",
    );
    expect(normalizeExtractedText("營業收入\t1,234\tNT$ 5 6")).toBe(
      "營業收入\t1,234\tNT$ 5 6",
    );
  });

  it("packs paragraphs up to the size limit and never exceeds it", () => {
    for (const length of [300, 750, 1700]) {
      const paragraph = "甲".repeat(length);
      const text = [paragraph, "乙", paragraph, paragraph].join("\n\n");
      const chunks = chunkText(text);
      expect(chunks.length).toBeGreaterThan(1);
      for (const chunk of chunks) {
        expect(chunk.length).toBeLessThanOrEqual(OBSERVATORY_CHUNK_SIZE);
      }
      // Info: (20261015 - Luphia) 每一段落的內容都要出現在某個切塊裡
      expect(chunks.some((chunk) => chunk.includes("乙"))).toBe(true);
      expect(
        chunks.join("").replace(/[^甲]/g, "").length,
      ).toBeGreaterThanOrEqual(length * 3);
    }
  });

  it("hard-splits an oversized paragraph with overlap", () => {
    const text = Array.from({ length: 2000 }, (_, i) => String(i % 10)).join(
      "",
    );
    const chunks = chunkText(text);
    expect(chunks[0].length).toBe(OBSERVATORY_CHUNK_SIZE);
    expect(
      chunks[1].startsWith(chunks[0].slice(-OBSERVATORY_CHUNK_OVERLAP)),
    ).toBe(true);
    expect(chunks.join("").length).toBeGreaterThanOrEqual(text.length);
  });

  it("numbers chunks across pages and keeps page numbers", () => {
    const chunks = chunkPages(["第一頁", "", "第三頁"]);
    expect(chunks).toEqual([
      { text: "第一頁", pageNumber: 1, chunkIndex: 0 },
      { text: "第三頁", pageNumber: 3, chunkIndex: 1 },
    ]);
  });

  it("is deterministic", () => {
    const text = "段落一\n\n段落二".repeat(200);
    expect(chunkText(text)).toEqual(chunkText(text));
  });
});

describe("company observatory host rate limiter", () => {
  it("spaces requests to the same host and leaves other hosts alone", async () => {
    let clock = 0;
    const sleeps: number[] = [];
    const limiter = createHostRateLimiter({
      intervals: { "a.example": 1000 },
      defaultIntervalMs: 200,
      now: () => clock,
      sleep: async (ms) => {
        sleeps.push(ms);
        clock += ms;
      },
    });
    await limiter.wait("a.example");
    await limiter.wait("a.example");
    await limiter.wait("b.example");
    clock += 5000;
    await limiter.wait("a.example");
    expect(sleeps).toEqual([1000]);
  });

  it("queues concurrent callers instead of releasing them together", async () => {
    const sleeps: number[] = [];
    const limiter = createHostRateLimiter({
      intervals: {},
      defaultIntervalMs: 500,
      now: () => 0,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });
    await Promise.all([
      limiter.wait("h"),
      limiter.wait("h"),
      limiter.wait("h"),
    ]);
    expect(sleeps.sort((a, b) => a - b)).toEqual([500, 1000]);
  });
});

describe("company observatory LanceDB filter", () => {
  it("builds filters from validated values", async () => {
    const buildObservatoryWhere = await loadWhereBuilder();
    expect(
      buildObservatoryWhere({
        stockIds: ["2330", "1101"],
        sources: [OBSERVATORY_SOURCE.ESG_REPORT],
        years: [2024, 2025],
      }),
    ).toBe(
      "stock_id IN ('2330', '1101') AND source IN ('ESG_REPORT') AND year IN (2024, 2025)",
    );
    expect(buildObservatoryWhere({ stockIds: [] })).toBeNull();
    expect(buildObservatoryWhere({})).toBeNull();
  });

  it("refuses values that could break out of the filter", async () => {
    const buildObservatoryWhere = await loadWhereBuilder();
    expect(() =>
      buildObservatoryWhere({ stockIds: ["2330' OR '1'='1"] }),
    ).toThrow();
    expect(observatoryStockIdSchema.safeParse("2330' OR 1=1").success).toBe(
      false,
    );
    expect(observatoryStockIdSchema.safeParse("006208").success).toBe(true);
  });
});
